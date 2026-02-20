"""
Recovery service — stage calculation + milestone tracking.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import MILESTONES, RECOVERY_STAGES
from app.models.models import Milestone, SymptomLog, User


def get_recovery_stage(surgery_date: datetime | None) -> dict[str, Any] | None:
    """Determine which recovery stage a patient is in based on days since surgery."""
    if surgery_date is None:
        return None

    days = (datetime.now(timezone.utc) - surgery_date).days
    for stage in RECOVERY_STAGES:
        if stage["min_day"] <= days <= stage["max_day"]:
            return {
                "name": stage["name"],
                "day": days,
                "description": stage["description"],
            }
    return {"name": "Unknown", "day": days, "description": "Beyond tracked stages"}


async def check_and_award_milestones(
    db: AsyncSession, patient_id: UUID, log_count: int | None = None
) -> list[dict[str, Any]]:
    """Check all milestone criteria and award any newly earned ones."""
    # Fetch existing milestones
    result = await db.execute(
        select(Milestone.milestone_key).where(Milestone.patient_id == patient_id)
    )
    earned_keys = set(result.scalars().all())

    # Fetch log count if not provided
    if log_count is None:
        count_result = await db.execute(
            select(func.count()).select_from(SymptomLog).where(SymptomLog.patient_id == patient_id)
        )
        log_count = count_result.scalar() or 0

    # Fetch recent logs for streak / improving checks
    logs_result = await db.execute(
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient_id)
        .order_by(SymptomLog.date.desc())
        .limit(30)
    )
    recent_logs = logs_result.scalars().all()

    newly_earned: list[dict[str, Any]] = []

    for milestone in MILESTONES:
        key = milestone["key"]
        if key in earned_keys:
            continue

        earned = False
        check = milestone["check"]
        threshold = milestone["threshold"]

        if check == "log_count":
            earned = log_count >= threshold

        elif check == "streak":
            # Check consecutive days
            if len(recent_logs) >= threshold:
                dates = sorted(set(log.date.date() for log in recent_logs), reverse=True)
                streak = 1
                for i in range(1, len(dates)):
                    if (dates[i - 1] - dates[i]).days == 1:
                        streak += 1
                    else:
                        break
                earned = streak >= threshold

        elif check == "improving":
            # Check if the last N logs show improving trend in mood/energy
            if len(recent_logs) >= threshold:
                moods = [log.mood for log in recent_logs[:threshold]]
                earned = all(moods[i] >= moods[i + 1] for i in range(len(moods) - 1))

        elif check == "pain_free":
            if recent_logs:
                earned = recent_logs[0].pain_level <= 1

        if earned:
            new_milestone = Milestone(
                patient_id=patient_id,
                milestone_key=key,
                title=milestone["title"],
                icon=milestone["icon"],
            )
            db.add(new_milestone)
            newly_earned.append({
                "key": key,
                "title": milestone["title"],
                "icon": milestone["icon"],
            })

    if newly_earned:
        await db.flush()

    return newly_earned
