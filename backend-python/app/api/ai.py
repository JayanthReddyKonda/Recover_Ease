"""
AI routes -- direct AI endpoints for patient insight + doctor summary.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import DbSession
from app.middleware.auth import DoctorUser, PatientUser
from app.schemas.common import ApiResponse
from app.services import groq_service, symptom_service

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/insight")
async def get_patient_insight(patient: PatientUser, db: DbSession):
    """Get AI-generated insight for the current patient."""
    logs = await symptom_service.get_logs(db, patient.id, limit=7)
    if not logs:
        return ApiResponse(data=None, message="No logs to analyze")

    patient_data = {
        "patient_id": str(patient.id),
        "patient_name": patient.name,
        "surgery_type": patient.surgery_type,
        "recent_logs": [
            {
                "date": log.date.isoformat(),
                "pain_level": log.pain_level,
                "mood": log.mood,
                "energy": log.energy,
                "sleep_hours": log.sleep_hours,
            }
            for log in logs
        ],
    }
    insight = await groq_service.generate_patient_insight(patient_data)
    return ApiResponse(data=insight)


@router.get("/summary/{patient_id}")
async def get_doctor_summary(patient_id: UUID, doctor: DoctorUser, db: DbSession):
    """Get AI-generated clinical summary for a specific patient (doctor only)."""
    # Verify doctor access
    from sqlalchemy import select
    from app.models.models import User

    result = await db.execute(select(User).where(User.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient or patient.doctor_id != doctor.id:
        from app.middleware.error_handler import AppError
        raise AppError("Not your patient", 403)

    logs = await symptom_service.get_logs(db, patient_id, limit=14)
    if not logs:
        return ApiResponse(data=None, message="No logs to analyze")

    patient_data = {
        "patient_id": str(patient_id),
        "patient_name": patient.name,
        "surgery_type": patient.surgery_type,
        "surgery_date": patient.surgery_date.isoformat() if patient.surgery_date else None,
        "log_count": len(logs),
        "recent_logs": [
            {
                "date": log.date.isoformat(),
                "pain_level": log.pain_level,
                "mood": log.mood,
                "energy": log.energy,
                "sleep_hours": log.sleep_hours,
                "fatigue_level": log.fatigue_level,
                "appetite": log.appetite,
            }
            for log in logs
        ],
    }
    summary = await groq_service.generate_doctor_summary(patient_data)
    return ApiResponse(data=summary)
