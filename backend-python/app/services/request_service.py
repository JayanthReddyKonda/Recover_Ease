"""
Doctor-patient request service — send, accept, reject, disconnect.
Only doctors can initiate requests; patients accept/reject.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.models import DoctorPatient, DoctorPatientRequest, RequestStatus, Role, User
from app.schemas.common import DoctorLink, SafeUser
from app.services import groq_service


async def send_request(
    db: AsyncSession,
    from_user: User,
    to_email: str | None = None,
    connect_code: str | None = None,
    specialty: str | None = None,
    visit_date: str | None = None,
    disease_description: str = "",
    medications: list[dict] | None = None,
) -> DoctorPatientRequest:
    """
    Doctors-only: send a clinical connection request to a patient.
    AI structures the clinical information into a care plan.
    """
    if from_user.role != Role.DOCTOR:
        raise AppError("Only doctors can send connection requests", 403)

    if not to_email and not connect_code:
        raise AppError("Provide either to_email or connect_code", 400)

    if connect_code:
        result = await db.execute(select(User).where(User.connect_code == connect_code.upper()))
    else:
        result = await db.execute(select(User).where(User.email == to_email))
    to_user = result.scalar_one_or_none()

    if not to_user:
        raise AppError("Patient not found", 404)
    if to_user.id == from_user.id:
        raise AppError("Cannot send request to yourself", 400)
    if to_user.role != Role.PATIENT:
        raise AppError("You can only send requests to patients", 400)

    # Check for any existing request (any status) — unique constraint uq_from_to
    # covers all statuses so we must handle all cases explicitly
    existing_result = await db.execute(
        select(DoctorPatientRequest).where(
            and_(
                DoctorPatientRequest.from_id == from_user.id,
                DoctorPatientRequest.to_id == to_user.id,
            )
        )
    )
    existing_req = existing_result.scalar_one_or_none()
    if existing_req:
        if existing_req.status == RequestStatus.PENDING:
            raise AppError("Request already pending for this patient", 409)
        # ACCEPTED / REJECTED → delete the old record so a fresh one can be inserted
        await db.delete(existing_req)
        await db.flush()

    # Check already linked
    already = await db.execute(
        select(DoctorPatient).where(
            and_(DoctorPatient.doctor_id == from_user.id, DoctorPatient.patient_id == to_user.id)
        )
    )
    if already.scalar_one_or_none():
        raise AppError("Already connected with this patient", 409)

    # ── AI structures the clinical information ──────────────────────────
    ai_plan: dict | None = None
    if disease_description.strip():
        visit_date_str = visit_date or None
        ai_plan = await groq_service.structure_clinical_request(
            disease_description=disease_description,
            medications=medications,
            visit_date=visit_date_str,
            patient_name=to_user.name,
            doctor_name=from_user.name,
        )

    # Parse visit_date to datetime if provided
    parsed_visit_date: datetime | None = None
    if visit_date:
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                parsed_visit_date = datetime.strptime(visit_date.strip(), fmt)
                break
            except ValueError:
                continue

    req = DoctorPatientRequest(
        from_id=from_user.id,
        to_id=to_user.id,
        status=RequestStatus.PENDING,
        specialty=specialty,
        visit_date=parsed_visit_date,
        disease_description=disease_description or None,
        medications=medications or None,
        ai_structured_plan=ai_plan,
    )
    db.add(req)
    await db.flush()
    await db.refresh(req)
    return req


async def get_pending_requests(db: AsyncSession, user: User) -> list[DoctorPatientRequest]:
    """Get all pending requests for the current user."""
    result = await db.execute(
        select(DoctorPatientRequest).where(
            and_(
                DoctorPatientRequest.to_id == user.id,
                DoctorPatientRequest.status == RequestStatus.PENDING,
            )
        )
    )
    return list(result.scalars().all())


async def accept_request(
    db: AsyncSession, user: User, request_id: UUID
) -> DoctorPatientRequest:
    """Accept a pending connection request and create a DoctorPatient link."""
    result = await db.execute(
        select(DoctorPatientRequest).where(DoctorPatientRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise AppError("Request not found", 404)
    if req.to_id != user.id:
        raise AppError("Not your request", 403)
    if req.status != RequestStatus.PENDING:
        raise AppError("Request is not pending", 400)

    req.status = RequestStatus.ACCEPTED

    # doctor→patient is always from_id→to_id now
    doctor_id = req.from_id
    patient_id = req.to_id

    existing = await db.execute(
        select(DoctorPatient).where(
            and_(DoctorPatient.doctor_id == doctor_id, DoctorPatient.patient_id == patient_id)
        )
    )
    if not existing.scalar_one_or_none():
        link = DoctorPatient(doctor_id=doctor_id, patient_id=patient_id)
        db.add(link)

    await db.flush()
    await db.refresh(req)
    return req


async def reject_request(
    db: AsyncSession, user: User, request_id: UUID
) -> DoctorPatientRequest:
    """Reject a pending connection request."""
    result = await db.execute(
        select(DoctorPatientRequest).where(DoctorPatientRequest.id == request_id)
    )
    req = result.scalar_one_or_none()

    if not req:
        raise AppError("Request not found", 404)
    if req.to_id != user.id:
        raise AppError("Not your request", 403)
    if req.status != RequestStatus.PENDING:
        raise AppError("Request is not pending", 400)

    req.status = RequestStatus.REJECTED
    await db.flush()
    await db.refresh(req)
    return req


async def get_my_doctors(db: AsyncSession, patient: User) -> list[DoctorLink]:
    """Get all doctors linked to this patient."""
    result = await db.execute(
        select(DoctorPatient).where(DoctorPatient.patient_id == patient.id)
    )
    links = result.scalars().all()
    return [
        DoctorLink(
            link_id=link.id,
            doctor_id=link.doctor_id,
            patient_id=link.patient_id,
            specialty=link.specialty,
            is_active=link.is_active,
            created_at=link.created_at,
            doctor=SafeUser.model_validate(link.doctor) if link.doctor else None,
        )
        for link in links
    ]


async def get_my_patients(db: AsyncSession, doctor: User) -> list[dict]:
    """Get all patients assigned to this doctor, with their treatment status."""
    result = await db.execute(
        select(DoctorPatient).where(DoctorPatient.doctor_id == doctor.id)
    )
    links = result.scalars().all()
    out = []
    for link in links:
        if link.patient:
            patient_data = SafeUser.model_validate(link.patient).model_dump()
            patient_data["is_active"] = link.is_active
            patient_data["link_id"] = str(link.id)
            out.append(patient_data)
    return out


async def disconnect(db: AsyncSession, user: User, other_id: UUID) -> bool:
    """Remove a doctor-patient link (either side can disconnect)."""
    if user.role == Role.PATIENT:
        doctor_id = other_id
        patient_id = user.id
    else:
        doctor_id = user.id
        patient_id = other_id

    result = await db.execute(
        select(DoctorPatient).where(
            and_(DoctorPatient.doctor_id == doctor_id, DoctorPatient.patient_id == patient_id)
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise AppError("Not connected", 400)

    await db.delete(link)
    await db.flush()
    return True


async def lookup_user_by_code(db: AsyncSession, connect_code: str) -> SafeUser:
    """Look up a user's public profile by their connect code."""
    result = await db.execute(
        select(User).where(User.connect_code == connect_code.upper())
    )
    user = result.scalar_one_or_none()
    if not user:
        raise AppError("No user found with that connect code", 404)
    return SafeUser.model_validate(user)
