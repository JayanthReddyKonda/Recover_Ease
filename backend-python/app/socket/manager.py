"""
Socket.io manager — real-time events for doctor/patient alerts.
Uses python-socketio with ASGI adapter.
"""

from __future__ import annotations

import socketio

from app.core.config import settings
from app.core.logger import logger

# Create the Socket.IO server (async mode for FastAPI)
_origins = settings.cors_origin.split(",") if settings.cors_origin else ["*"]
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*" if "*" in _origins else _origins,
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None) -> None:
    logger.info("socket_connected", sid=sid)


@sio.event
async def disconnect(sid: str) -> None:
    logger.info("socket_disconnected", sid=sid)


@sio.event
async def join_doctor_room(sid: str, data: dict) -> None:
    """Doctor joins their personal alert room."""
    doctor_id = data.get("doctor_id")
    if doctor_id:
        room = f"doctor:{doctor_id}"
        await sio.enter_room(sid, room)
        # Also join the broadcast room
        await sio.enter_room(sid, "doctor_alerts")
        logger.info("doctor_joined_room", sid=sid, room=room)


@sio.event
async def join_patient_room(sid: str, data: dict) -> None:
    """Patient joins their personal room for milestone notifications etc."""
    patient_id = data.get("patient_id")
    if patient_id:
        room = f"patient:{patient_id}"
        await sio.enter_room(sid, room)
        logger.info("patient_joined_room", sid=sid, room=room)


@sio.event
async def join_chat_room(sid: str, data: dict) -> None:
    """Join a specific chat session room to receive real-time messages."""
    session_id = data.get("session_id")
    if session_id:
        room = f"chat:{session_id}"
        await sio.enter_room(sid, room)
        logger.info("joined_chat_room", sid=sid, room=room)


@sio.event
async def leave_chat_room(sid: str, data: dict) -> None:
    """Leave a chat session room."""
    session_id = data.get("session_id")
    if session_id:
        await sio.leave_room(sid, f"chat:{session_id}")


@sio.event
async def typing(sid: str, data: dict) -> None:
    """Broadcast typing indicator to chat room."""
    session_id = data.get("session_id")
    user_name = data.get("user_name", "Someone")
    if session_id:
        await sio.emit(
            "typing",
            {"session_id": session_id, "user_name": user_name},
            room=f"chat:{session_id}",
            skip_sid=sid,
        )


def create_sio_app() -> socketio.ASGIApp:
    """Create the ASGI app wrapper for Socket.IO."""
    return socketio.ASGIApp(sio)
