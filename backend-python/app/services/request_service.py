"""
Doctor-patient request service — send, accept, reject, disconnect.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.models import DoctorPatientRequest, RequestStatus, Role, User
from app.schemas.common import SafeUser


async def send_request(db: AsyncSession, from_user: User, to_email: str) -> DoctorPatientRequest:
    """Send a connection request (doctor ↔ patient)."""
    result = await db.execute(select(User).where(User.email == to_email))
    to_user = result.scalar_one_or_none()

    if not to_user:
        raise AppError("User not found with that email", 404)
    if to_user.id == from_user.id:
        raise AppError("Cannot send request to yourself", 400)

    # Validate role pairing
    if from_user.role == to_user.role:
        raise AppError("Both users have the same role — need doctor + patient", 400)

    # Check for existing request
    existing = await db.execute(
        select(DoctorPatientRequest).where(
            and_(
                DoctorPatientRequest.from_id == from_user.id,
                DoctorPatientRequest.to_id == to_user.id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise AppError("Request already exists", 409)

    req = DoctorPatientRequest(
        from_id=from_user.id,
        to_id=to_user.id,
        status=RequestStatus.PENDING,
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


async def accept_request(db: AsyncSession, user: User, request_id: UUID) -> DoctorPatientRequest:
    """Accept a pending connection request and link doctor ↔ patient."""
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

    # Link doctor ↔ patient
    doctor_id = req.from_id if user.role == Role.PATIENT else user.id
    patient_id = user.id if user.role == Role.PATIENT else req.from_id

    patient_result = await db.execute(select(User).where(User.id == patient_id))
    patient = patient_result.scalar_one_or_none()
    if patient:
        patient.doctor_id = doctor_id

    await db.flush()
    await db.refresh(req)
    return req


async def reject_request(db: AsyncSession, user: User, request_id: UUID) -> DoctorPatientRequest:
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


async def get_my_doctor(db: AsyncSession, patient: User) -> SafeUser | None:
    """Get the patient's assigned doctor."""
    if not patient.doctor_id:
        return None
    result = await db.execute(select(User).where(User.id == patient.doctor_id))
    doctor = result.scalar_one_or_none()
    return SafeUser.model_validate(doctor) if doctor else None


async def get_my_patients(db: AsyncSession, doctor: User) -> list[SafeUser]:
    """Get all patients assigned to this doctor."""
    result = await db.execute(
        select(User).where(User.doctor_id == doctor.id)
    )
    patients = result.scalars().all()
    return [SafeUser.model_validate(p) for p in patients]


async def disconnect(db: AsyncSession, user: User, other_id: UUID) -> bool:
    """Remove doctor-patient link."""
    if user.role == Role.PATIENT:
        if user.doctor_id != other_id:
            raise AppError("Not connected to this doctor", 400)
        user.doctor_id = None
    else:
        result = await db.execute(select(User).where(User.id == other_id))
        patient = result.scalar_one_or_none()
        if not patient or patient.doctor_id != user.id:
            raise AppError("Not connected to this patient", 400)
        patient.doctor_id = None

    await db.flush()
    return True
