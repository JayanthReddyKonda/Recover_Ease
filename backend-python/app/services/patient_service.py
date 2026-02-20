"""
Patient service — profile, full view (doctor), SOS trigger, escalation review.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.models import (
    DoctorPatient,
    Escalation,
    EscalationStatus,
    Milestone,
    Severity,
    SymptomLog,
    User,
)
from app.schemas.common import SafeUser
from app.schemas.patient import EscalationResponse, MilestoneResponse
from app.schemas.symptom import SymptomLogResponse
from app.services import email_service, escalation_service, groq_service, recovery_service, whatsapp_service


async def _verify_doctor_access(db: AsyncSession, doctor: User, patient_id: UUID) -> User:
    """Verify the doctor has access to this patient via the junction table."""
    result = await db.execute(select(User).where(User.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise AppError("Patient not found", 404)

    link_result = await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient_id,
        )
    )
    if not link_result.scalar_one_or_none():
        raise AppError("Not your patient", 403)
    return patient


async def update_surgery_details(
    db: AsyncSession,
    doctor: User,
    patient_id: UUID,
    surgery_type: str | None,
    surgery_date: str | None,
) -> None:
    """Doctor sets surgery_type and surgery_date on a patient's User record."""
    from datetime import datetime as dt
    patient = await _verify_doctor_access(db, doctor, patient_id)
    patient.surgery_type = surgery_type or None
    patient.surgery_date = dt.fromisoformat(surgery_date) if surgery_date else None
    await db.flush()


async def get_patient_profile(db: AsyncSession, patient: User) -> dict[str, Any]:
    """Get a patient's own profile with stats."""
    # Log count
    count_result = await db.execute(
        select(func.count()).select_from(SymptomLog).where(SymptomLog.patient_id == patient.id)
    )
    log_count = count_result.scalar() or 0

    # Latest log
    latest_result = await db.execute(
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient.id)
        .order_by(SymptomLog.date.desc())
        .limit(1)
    )
    latest_log = latest_result.scalar_one_or_none()

    # Milestones
    milestones_result = await db.execute(
        select(Milestone).where(Milestone.patient_id == patient.id)
    )
    milestones = milestones_result.scalars().all()

    return {
        "user": SafeUser.model_validate(patient),
        "log_count": log_count,
        "latest_log": SymptomLogResponse.model_validate(latest_log) if latest_log else None,
        "milestones": [MilestoneResponse.model_validate(m) for m in milestones],
        "recovery_stage": recovery_service.get_recovery_stage(patient.surgery_date),
    }


async def get_patient_full(db: AsyncSession, doctor: User, patient_id: UUID) -> dict[str, Any]:
    """Doctor's full view of a patient — logs, escalations, milestones, AI summary."""
    patient = await _verify_doctor_access(db, doctor, patient_id)

    # Logs
    logs_result = await db.execute(
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient_id)
        .order_by(SymptomLog.date.desc())
        .limit(30)
    )
    logs = logs_result.scalars().all()

    # Escalations
    esc_result = await db.execute(
        select(Escalation)
        .where(Escalation.patient_id == patient_id)
        .order_by(Escalation.created_at.desc())
    )
    escalations = esc_result.scalars().all()

    # Milestones
    mile_result = await db.execute(
        select(Milestone).where(Milestone.patient_id == patient_id)
    )
    milestones = mile_result.scalars().all()

    # AI summary
    patient_data = {
        "patient_id": str(patient_id),
        "patient_name": patient.name,
        "surgery_type": patient.surgery_type,
        "surgery_date": patient.surgery_date.isoformat() if patient.surgery_date else None,
        "log_count": len(logs),
        "recent_logs": [
            {
                "date": l.date.isoformat(),
                "pain_level": l.pain_level,
                "mood": l.mood,
                "energy": l.energy,
                "sleep_hours": l.sleep_hours,
            }
            for l in logs[:7]
        ],
    }
    ai_summary = await groq_service.generate_doctor_summary(patient_data)

    return {
        "user": SafeUser.model_validate(patient),
        "logs": [SymptomLogResponse.model_validate(l) for l in logs],
        "escalations": [EscalationResponse.model_validate(e) for e in escalations],
        "milestones": [MilestoneResponse.model_validate(m) for m in milestones],
        "recovery_stage": recovery_service.get_recovery_stage(patient.surgery_date),
        "ai_summary": ai_summary,
    }


async def trigger_sos(
    db: AsyncSession,
    patient: User,
    notes: str | None = None,
    sio: Any = None,
) -> Escalation:
    """Patient triggers an SOS — immediate CRITICAL escalation."""
    # Create a minimal symptom log for the SOS
    log = SymptomLog(
        patient_id=patient.id,
        pain_level=10,
        fatigue_level=10,
        mood=1,
        sleep_hours=0,
        appetite=1,
        energy=1,
        notes=f"SOS: {notes}" if notes else "SOS triggered",
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    escalation = await escalation_service.run_escalation_check(db, log, is_sos=True)

    # Gather only ACTIVE-treatment doctors (not already-recovered patients)
    links_result = await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.patient_id == patient.id,
            DoctorPatient.is_active == True,  # noqa: E712
        )
    )
    links = links_result.scalars().all()

    first_doctor_id = links[0].doctor_id if links else None

    if not escalation:
        escalation = Escalation(
            patient_id=patient.id,
            symptom_log_id=log.id,
            doctor_id=first_doctor_id,
            severity=Severity.CRITICAL,
            status=EscalationStatus.OPEN,
            is_sos=True,
        )
        db.add(escalation)
        await db.flush()
        await db.refresh(escalation)

    # Notify ALL linked doctors
    for link in links:
        doctor_result = await db.execute(select(User).where(User.id == link.doctor_id))
        doctor = doctor_result.scalar_one_or_none()
        if doctor:
            await email_service.send_sos_alert(doctor.email, patient.name, notes)
            if sio:
                await sio.emit(
                    "patient_alert",
                    {
                        "type": "sos",
                        "patient_id": str(patient.id),
                        "patient_name": patient.name,
                        "severity": "CRITICAL",
                        "is_sos": True,
                    },
                    room=f"doctor:{link.doctor_id}",
                )
            # WhatsApp alert to doctor
            if doctor.whatsapp_phone:
                sos_msg = (
                    f"🚨 *SOS ALERT — RecoverEase*\n"
                    f"Patient: *{patient.name}*\n"
                    f"Severity: CRITICAL\n"
                    f"Message: {notes or 'No details provided'}\n"
                    f"👉 Open your dashboard immediately."
                )
                await whatsapp_service.send_text(doctor.whatsapp_phone, sos_msg)

    if patient.caregiver_email:
        await email_service.send_caregiver_alert(
            patient.caregiver_email, patient.name, "CRITICAL", f"SOS: {notes or 'No details'}"
        )

    return escalation


async def set_treatment_status(
    db: AsyncSession,
    doctor: User,
    patient_id: UUID,
    is_active: bool,
) -> None:
    """Doctor toggles a patient's treatment status (active ↔ recovered)."""
    link_result = await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient_id,
        )
    )
    link = link_result.scalar_one_or_none()
    if not link:
        from app.middleware.error_handler import AppError
        raise AppError("Not your patient", 403)
    link.is_active = is_active
    await db.flush()


async def review_escalation(
    db: AsyncSession,
    doctor: User,
    escalation_id: UUID,
    status: str,
    notes: str | None = None,
) -> Escalation:
    """Doctor reviews and updates an escalation."""
    result = await db.execute(select(Escalation).where(Escalation.id == escalation_id))
    esc = result.scalar_one_or_none()

    if not esc:
        raise AppError("Escalation not found", 404)

    # Verify doctor has access
    await _verify_doctor_access(db, doctor, esc.patient_id)

    esc.status = EscalationStatus(status)
    esc.doctor_notes = notes
    if status == "RESOLVED":
        esc.resolved_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(esc)
    return esc
