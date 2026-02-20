"""
Doctor-patient request service — send, accept, reject, disconnect.
Patients can have MULTIPLE doctors; connect via email OR connect_code.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.models import DoctorPatient, DoctorPatientRequest, RequestStatus, Role, User
from app.schemas.common import DoctorLink, SafeUser


async def send_request(
    db: AsyncSession,
    from_user: User,
    to_email: str | None = None,
    connect_code: str | None = None,
    specialty: str | None = None,
) -> DoctorPatientRequest:
    """Send a connection request (doctor ↔ patient) by email or connect_code."""
    if not to_email and not connect_code:
        raise AppError("Provide either to_email or connect_code", 400)

    if connect_code:
        result = await db.execute(select(User).where(User.connect_code == connect_code.upper()))
    else:
        result = await db.execute(select(User).where(User.email == to_email))
    to_user = result.scalar_one_or_none()

    if not to_user:
        raise AppError("User not found", 404)
    if to_user.id == from_user.id:
        raise AppError("Cannot send request to yourself", 400)

    if from_user.role == to_user.role:
        raise AppError("Both users have the same role — need doctor + patient", 400)

    # Check for existing PENDING request in either direction
    existing = await db.execute(
        select(DoctorPatientRequest).where(
            and_(
                DoctorPatientRequest.from_id == from_user.id,
                DoctorPatientRequest.to_id == to_user.id,
                DoctorPatientRequest.status == RequestStatus.PENDING,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise AppError("Request already pending", 409)

    reverse = await db.execute(
        select(DoctorPatientRequest).where(
            and_(
                DoctorPatientRequest.from_id == to_user.id,
                DoctorPatientRequest.to_id == from_user.id,
                DoctorPatientRequest.status == RequestStatus.PENDING,
            )
        )
    )
    if reverse.scalar_one_or_none():
        raise AppError("A pending request from this user already exists", 409)

    # Check already linked
    doctor_id = from_user.id if from_user.role == Role.DOCTOR else to_user.id
    patient_id = from_user.id if from_user.role == Role.PATIENT else to_user.id
    already = await db.execute(
        select(DoctorPatient).where(
            and_(DoctorPatient.doctor_id == doctor_id, DoctorPatient.patient_id == patient_id)
        )
    )
    if already.scalar_one_or_none():
        raise AppError("Already connected", 409)

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

    doctor_id = req.from_id if user.role == Role.PATIENT else user.id
    patient_id = user.id if user.role == Role.PATIENT else req.from_id

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
            created_at=link.created_at,
            doctor=SafeUser.model_validate(link.doctor) if link.doctor else None,
        )
        for link in links
    ]


async def get_my_patients(db: AsyncSession, doctor: User) -> list[SafeUser]:
    """Get all patients assigned to this doctor."""
    result = await db.execute(
        select(DoctorPatient).where(DoctorPatient.doctor_id == doctor.id)
    )
    links = result.scalars().all()
    return [SafeUser.model_validate(link.patient) for link in links if link.patient]


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
