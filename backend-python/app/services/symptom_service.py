"""
Symptom log service — create logs, fetch history, summaries, trends.
"""

from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.models.models import SymptomLog
from app.schemas.symptom import LogSymptomRequest
from app.services import escalation_service, groq_service, recovery_service


async def log_symptoms(
    db: AsyncSession,
    patient_id: UUID,
    data: LogSymptomRequest,
    sio: Any = None,
) -> SymptomLog:
    """Create a new symptom log entry with AI enrichment and escalation check."""
    # Parse notes via AI (if notes exist)
    parsed = None
    if data.notes:
        parsed = await groq_service.parse_symptom_input(data.notes)

    log = SymptomLog(
        patient_id=patient_id,
        pain_level=data.pain_level,
        fatigue_level=data.fatigue_level,
        mood=data.mood,
        sleep_hours=data.sleep_hours,
        appetite=data.appetite,
        energy=data.energy,
        temperature=data.temperature,
        notes=data.notes,
        parsed_symptoms=parsed,
    )
    db.add(log)
    await db.flush()
    await db.refresh(log)

    # Generate AI insight
    patient_data = {
        "patient_id": str(patient_id),
        "date": log.date.isoformat(),
        "pain_level": log.pain_level,
        "mood": log.mood,
        "energy": log.energy,
        "sleep_hours": log.sleep_hours,
    }
    insight = await groq_service.generate_patient_insight(patient_data)
    if insight:
        log.ai_insight = insight
        await db.flush()

    # Run escalation check
    escalation = await escalation_service.run_escalation_check(db, log)

    # Award milestones
    log_count_result = await db.execute(
        select(func.count()).select_from(SymptomLog).where(SymptomLog.patient_id == patient_id)
    )
    log_count = log_count_result.scalar() or 0
    new_milestones = await recovery_service.check_and_award_milestones(db, patient_id, log_count)

    # Real-time notifications via Socket.io
    if sio and escalation:
        from app.models.models import User
        patient_result = await db.execute(select(User).where(User.id == patient_id))
        patient = patient_result.scalar_one_or_none()
        if patient and patient.doctor_id:
            await sio.emit(
                "patient_alert",
                {
                    "type": "escalation",
                    "patient_id": str(patient_id),
                    "patient_name": patient.name,
                    "severity": escalation.severity.value,
                    "is_sos": escalation.is_sos,
                },
                room=f"doctor:{patient.doctor_id}",
            )

    if sio and new_milestones:
        await sio.emit(
            "milestone_earned",
            {"milestones": new_milestones},
            room=f"patient:{patient_id}",
        )

    logger.info("symptom_logged", patient_id=str(patient_id), log_id=str(log.id))
    return log


async def get_logs(
    db: AsyncSession, patient_id: UUID, limit: int = 30, offset: int = 0
) -> list[SymptomLog]:
    """Fetch symptom logs for a patient, newest first."""
    result = await db.execute(
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient_id)
        .order_by(SymptomLog.date.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_today_log(db: AsyncSession, patient_id: UUID) -> SymptomLog | None:
    """Get today's log (if any)."""
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min, tzinfo=timezone.utc)
    result = await db.execute(
        select(SymptomLog).where(
            and_(
                SymptomLog.patient_id == patient_id,
                SymptomLog.date >= today_start,
            )
        ).order_by(SymptomLog.date.desc()).limit(1)
    )
    return result.scalar_one_or_none()


async def get_symptom_summary(db: AsyncSession, patient_id: UUID) -> dict[str, Any]:
    """Aggregate stats for a patient's symptom history."""
    result = await db.execute(
        select(
            func.count().label("total"),
            func.avg(SymptomLog.pain_level).label("avg_pain"),
            func.avg(SymptomLog.mood).label("avg_mood"),
            func.avg(SymptomLog.energy).label("avg_energy"),
            func.avg(SymptomLog.sleep_hours).label("avg_sleep"),
        ).where(SymptomLog.patient_id == patient_id)
    )
    row = result.one()

    return {
        "total_logs": row.total or 0,
        "avg_pain": round(float(row.avg_pain or 0), 1),
        "avg_mood": round(float(row.avg_mood or 0), 1),
        "avg_energy": round(float(row.avg_energy or 0), 1),
        "avg_sleep": round(float(row.avg_sleep or 0), 1),
    }


async def get_symptom_trend(db: AsyncSession, patient_id: UUID, days: int = 14) -> list[dict[str, Any]]:
    """Get daily symptom data for the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(SymptomLog)
        .where(
            and_(
                SymptomLog.patient_id == patient_id,
                SymptomLog.date >= since,
            )
        )
        .order_by(SymptomLog.date.asc())
    )
    logs = result.scalars().all()

    return [
        {
            "date": log.date.strftime("%Y-%m-%d"),
            "pain_level": log.pain_level,
            "fatigue_level": log.fatigue_level,
            "mood": log.mood,
            "sleep_hours": log.sleep_hours,
            "appetite": log.appetite,
            "energy": log.energy,
        }
        for log in logs
    ]
