"""
Chat API — doctor-patient real-time messaging and AI conversational chat.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select, or_

from app.api.deps import DbSession
from app.middleware.auth import CurrentUser, DoctorUser, PatientUser
from app.middleware.error_handler import AppError
from app.models.models import (
    ChatMessage,
    ChatSession,
    ChatSessionStatus,
    DoctorPatient,
    User,
)
from app.schemas.chat import (
    AIMessageIn,
    CreateSessionIn,
    MessageOut,
    SendMessageIn,
    SessionOut,
)
from app.schemas.common import ApiResponse
from app.services import groq_service, symptom_service
from app.socket.manager import sio

router = APIRouter(prefix="/chat", tags=["Chat"])


# ─────────────────────────────────────────────
# Helper: verify session access
# ─────────────────────────────────────────────

async def _get_session_or_403(db: DbSession, session_id: UUID, user_id: UUID) -> ChatSession:
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise AppError("Session not found", 404)
    if session.patient_id != user_id and session.doctor_id != user_id:
        raise AppError("Access denied", 403)
    return session


def _session_to_out(session: ChatSession) -> SessionOut:
    last = session.messages[-1].content[:80] if session.messages else None
    return SessionOut(
        id=session.id,
        patient_id=session.patient_id,
        doctor_id=session.doctor_id,
        status=session.status.value,
        title=session.title,
        is_request=session.is_request,
        created_at=session.created_at,
        updated_at=session.updated_at,
        last_message=last,
    )


def _message_to_out(msg: ChatMessage) -> MessageOut:
    return MessageOut(
        id=msg.id,
        session_id=msg.session_id,
        sender_id=msg.sender_id,
        content=msg.content,
        is_ai=msg.is_ai,
        is_voice=msg.is_voice,
        created_at=msg.created_at,
        sender_name=msg.sender.name if msg.sender else ("AI Assistant" if msg.is_ai else None),
    )


# ─────────────────────────────────────────────
# GET /chat/sessions — list all sessions for the current user
# ─────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(ChatSession).where(
            or_(
                ChatSession.patient_id == user.id,
                ChatSession.doctor_id == user.id,
            )
        ).order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()
    return ApiResponse(data=[_session_to_out(s) for s in sessions])


# ─────────────────────────────────────────────
# POST /chat/sessions/ai — get or create an AI chat session for the patient
# ─────────────────────────────────────────────

@router.post("/sessions/ai")
async def get_or_create_ai_session(patient: PatientUser, db: DbSession):
    """Returns the patient's AI session (creates one if it doesn't exist)."""
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.patient_id == patient.id,
            ChatSession.doctor_id.is_(None),
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        session = ChatSession(
            patient_id=patient.id,
            doctor_id=None,
            title="AI Recovery Assistant",
            status=ChatSessionStatus.ACTIVE,
            is_request=False,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
    return ApiResponse(data=_session_to_out(session))


# ─────────────────────────────────────────────
# POST /chat/sessions — patient requests chat with a past doctor
# ─────────────────────────────────────────────

@router.post("/sessions")
async def request_doctor_chat(body: CreateSessionIn, patient: PatientUser, db: DbSession):
    """
    Patient requests a chat session with a doctor.
    - If they have an active treatment link → session is immediately ACTIVE.
    - If the link is inactive (past doctor) → session is REQUESTED (doctor must accept).
    """
    # Verify doctor exists
    doc_result = await db.execute(select(User).where(User.id == body.doctor_id))
    doctor = doc_result.scalar_one_or_none()
    if not doctor or doctor.role.value != "DOCTOR":
        raise AppError("Doctor not found", 404)

    # Check existing open session
    existing = await db.execute(
        select(ChatSession).where(
            ChatSession.patient_id == patient.id,
            ChatSession.doctor_id == body.doctor_id,
            ChatSession.status != ChatSessionStatus.CLOSED,
        )
    )
    if existing.scalar_one_or_none():
        raise AppError("A chat session with this doctor already exists", 409)

    # Check link status
    link_result = await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == body.doctor_id,
            DoctorPatient.patient_id == patient.id,
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        raise AppError("You are not linked to this doctor", 403)

    status = ChatSessionStatus.ACTIVE if link.is_active else ChatSessionStatus.REQUESTED
    session = ChatSession(
        patient_id=patient.id,
        doctor_id=body.doctor_id,
        title=f"Dr. {doctor.name}{' — ' + link.specialty if link.specialty else ''}",
        status=status,
        is_request=not link.is_active,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Notify the doctor via socket if it's a request
    if status == ChatSessionStatus.REQUESTED:
        await sio.emit(
            "chat_request",
            {
                "session_id": str(session.id),
                "patient_name": patient.name,
                "title": session.title,
            },
            room=f"doctor:{body.doctor_id}",
        )

    return ApiResponse(data=_session_to_out(session), message="Session created")


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/accept — doctor accepts a REQUESTED session
# ─────────────────────────────────────────────

@router.post("/sessions/{session_id}/accept")
async def accept_session(session_id: UUID, doctor: DoctorUser, db: DbSession):
    session = await _get_session_or_403(db, session_id, doctor.id)
    if session.status != ChatSessionStatus.REQUESTED:
        raise AppError("Session is not in REQUESTED state", 400)
    session.status = ChatSessionStatus.ACTIVE
    await db.commit()

    # Notify patient
    await sio.emit(
        "chat_request_accepted",
        {"session_id": str(session_id), "doctor_name": doctor.name},
        room=f"patient:{session.patient_id}",
    )
    return ApiResponse(data=_session_to_out(session))


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/close
# ─────────────────────────────────────────────

@router.post("/sessions/{session_id}/close")
async def close_session(session_id: UUID, user: CurrentUser, db: DbSession):
    session = await _get_session_or_403(db, session_id, user.id)
    session.status = ChatSessionStatus.CLOSED
    await db.commit()
    return ApiResponse(data=_session_to_out(session))


# ─────────────────────────────────────────────
# GET /chat/sessions/{id}/messages
# ─────────────────────────────────────────────

@router.get("/sessions/{session_id}/messages")
async def get_messages(session_id: UUID, user: CurrentUser, db: DbSession):
    session = await _get_session_or_403(db, session_id, user.id)
    return ApiResponse(data=[_message_to_out(m) for m in session.messages])


# ─────────────────────────────────────────────
# POST /chat/sessions/{id}/messages — send a message via HTTP (doctor ↔ patient)
# ─────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages")
async def send_message(session_id: UUID, body: SendMessageIn, user: CurrentUser, db: DbSession):
    session = await _get_session_or_403(db, session_id, user.id)
    if session.status != ChatSessionStatus.ACTIVE:
        raise AppError("Session is not active", 400)

    msg = ChatMessage(
        session_id=session_id,
        sender_id=user.id,
        content=body.content.strip(),
        is_ai=False,
        is_voice=body.is_voice,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    out = _message_to_out(msg)

    # Broadcast to the other party via socket
    # Emit to both patient and doctor rooms so both see it in real time
    await sio.emit(
        "new_message",
        {
            "session_id": str(session_id),
            "message": {
                "id": str(out.id),
                "sender_id": str(out.sender_id) if out.sender_id else None,
                "sender_name": out.sender_name,
                "content": out.content,
                "is_ai": out.is_ai,
                "is_voice": out.is_voice,
                "created_at": out.created_at.isoformat(),
            },
        },
        room=f"chat:{session_id}",
        skip_sid=None,
    )

    return ApiResponse(data=out)


# ─────────────────────────────────────────────
# POST /chat/ai/message — send message to AI and get reply
# ─────────────────────────────────────────────

@router.post("/ai/message")
async def send_ai_message(body: AIMessageIn, patient: PatientUser, db: DbSession):
    """Patient sends a message to the AI. Stores both user message & AI reply."""
    session = await _get_session_or_403(db, body.session_id, patient.id)
    if session.doctor_id is not None:
        raise AppError("This is not an AI session", 400)

    # Save the patient message
    user_msg = ChatMessage(
        session_id=body.session_id,
        sender_id=patient.id,
        content=body.content.strip(),
        is_ai=False,
        is_voice=body.is_voice,
    )
    db.add(user_msg)
    await db.flush()

    # Build conversation history from existing messages (last 20)
    history = [
        {"role": "assistant" if m.is_ai else "user", "content": m.content}
        for m in session.messages[-19:]  # -19 because we haven't committed the new one yet
    ]
    history.append({"role": "user", "content": body.content})

    # Get optional patient context (latest symptom log)
    patient_context: dict | None = None
    try:
        logs = await symptom_service.get_logs(db, patient.id, limit=3)
        if logs:
            patient_context = {
                "patient_name": patient.name,
                "surgery_type": patient.surgery_type,
                "recent_pain": logs[0].pain_level,
                "recent_mood": logs[0].mood,
                "recent_energy": logs[0].energy,
                "sleep_hours": logs[0].sleep_hours,
            }
    except Exception:
        pass

    ai_reply = await groq_service.ai_chat_reply(history, patient_context)
    if not ai_reply:
        ai_reply = "I'm having trouble connecting right now. Please try again in a moment."

    ai_msg = ChatMessage(
        session_id=body.session_id,
        sender_id=None,
        content=ai_reply,
        is_ai=True,
        is_voice=False,
    )
    db.add(ai_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(ai_msg)

    return ApiResponse(data={
        "user_message": _message_to_out(user_msg),
        "ai_reply": _message_to_out(ai_msg),
    })
