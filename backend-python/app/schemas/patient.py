"""
Patient-related schemas (doctor's view, escalation, etc.).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import SafeUser
from app.schemas.symptom import SymptomLogResponse


class EscalationResponse(BaseModel):
    id: UUID
    patient_id: UUID
    symptom_log_id: UUID
    doctor_id: UUID | None
    severity: str
    status: str
    rule_results: dict[str, Any] | None
    ai_verdict: dict[str, Any] | None
    is_sos: bool
    doctor_notes: str | None
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}


class MilestoneResponse(BaseModel):
    id: UUID
    milestone_key: str
    title: str
    icon: str
    earned_at: datetime

    model_config = {"from_attributes": True}


class PatientProfile(BaseModel):
    user: SafeUser
    log_count: int
    latest_log: SymptomLogResponse | None
    milestones: list[MilestoneResponse]
    recovery_stage: dict[str, Any] | None


class PatientFull(BaseModel):
    user: SafeUser
    logs: list[SymptomLogResponse]
    escalations: list[EscalationResponse]
    milestones: list[MilestoneResponse]
    recovery_stage: dict[str, Any] | None
    ai_summary: dict[str, Any] | None


class ReviewEscalationRequest(BaseModel):
    status: str = Field(pattern="^(ACKNOWLEDGED|RESOLVED)$")
    notes: str | None = Field(None, max_length=2000)


class SOSRequest(BaseModel):
    notes: str | None = Field(None, max_length=2000)
