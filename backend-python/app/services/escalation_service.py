"""
Escalation service — rule-based checks + AI verdict hybrid.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import ESCALATION_RULES
from app.core.logger import logger
from app.models.models import Escalation, EscalationStatus, Severity, SymptomLog
from app.services import groq_service


def run_rule_checks(log: SymptomLog) -> list[dict[str, Any]]:
    """Run all escalation rules against a symptom log. Returns triggered rules."""
    triggered: list[dict[str, Any]] = []

    for rule_key, rule in ESCALATION_RULES.items():
        rule_type = rule.get("type")

        if rule_type == "trend":
            # Trend rules need historical data — handled separately
            continue

        field = rule.get("field")
        threshold = rule.get("threshold")
        compare = rule.get("compare", "gte")  # default: value >= threshold

        value = getattr(log, field, None) if field else None
        if value is None:
            continue

        hit = False
        if compare == "gte":
            hit = value >= threshold
        elif compare == "lte":
            hit = value <= threshold
        elif compare == "lt":
            hit = value < threshold
        elif compare == "gt":
            hit = value > threshold

        if hit:
            triggered.append({
                "rule": rule_key,
                "description": rule["description"],
                "severity": rule["severity"],
                "value": value,
                "threshold": threshold,
            })

    return triggered


def _max_severity(triggered: list[dict[str, Any]]) -> Severity:
    """Determine the maximum severity from triggered rules."""
    severity_order = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    max_level = 0
    for t in triggered:
        level = severity_order.get(t["severity"].lower(), 0)
        max_level = max(max_level, level)
    reverse_map = {0: Severity.LOW, 1: Severity.MEDIUM, 2: Severity.HIGH, 3: Severity.CRITICAL}
    return reverse_map[max_level]


async def run_escalation_check(
    db: AsyncSession,
    log: SymptomLog,
    is_sos: bool = False,
) -> Escalation | None:
    """
    Full escalation pipeline:
    1. Run rule-based checks
    2. If triggers found (or SOS), ask AI for a verdict
    3. Create escalation record
    """
    triggered = run_rule_checks(log)

    if not triggered and not is_sos:
        return None

    # Build symptom data for AI
    symptom_data = {
        "log_id": str(log.id),
        "pain_level": log.pain_level,
        "fatigue_level": log.fatigue_level,
        "mood": log.mood,
        "sleep_hours": log.sleep_hours,
        "appetite": log.appetite,
        "energy": log.energy,
        "temperature": log.temperature,
        "notes": log.notes,
    }

    # Get AI verdict (fire-and-forget-safe)
    ai_verdict = await groq_service.get_escalation_verdict(symptom_data, triggered)

    # Determine severity
    if is_sos:
        severity = Severity.CRITICAL
    elif ai_verdict and ai_verdict.get("severity"):
        try:
            severity = Severity(ai_verdict["severity"].upper())
        except (ValueError, KeyError):
            severity = _max_severity(triggered) if triggered else Severity.HIGH
    else:
        severity = _max_severity(triggered) if triggered else Severity.HIGH

    # Determine doctor_id from the patient
    patient = log.patient
    doctor_id = patient.doctor_id if patient else None

    escalation = Escalation(
        patient_id=log.patient_id,
        symptom_log_id=log.id,
        doctor_id=doctor_id,
        severity=severity,
        status=EscalationStatus.OPEN,
        rule_results=triggered or None,
        ai_verdict=ai_verdict,
        is_sos=is_sos,
    )
    db.add(escalation)
    await db.flush()
    await db.refresh(escalation)

    logger.info(
        "escalation_created",
        escalation_id=str(escalation.id),
        patient_id=str(log.patient_id),
        severity=severity.value,
        is_sos=is_sos,
    )

    return escalation
