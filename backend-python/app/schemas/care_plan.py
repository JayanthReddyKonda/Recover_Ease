"""
Pydantic schemas for the care-plan and recovery-task endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


# ── Sub-models ───────────────────────────────────────

class MedicationItem(BaseModel):
    name: str
    dosage: str
    frequency: str
    time_of_day: str
    instructions: str = ""


# ── Care-plan update (doctor → patient link) ─────────

class UpdateCarePlanBody(BaseModel):
    medications: list[MedicationItem] | None = None
    expected_recovery_date: str | None = None   # ISO date string "YYYY-MM-DD"
    recovery_duration: str | None = None         # e.g. "6 weeks"
    care_notes: str | None = None


class CarePlanResponse(BaseModel):
    patient_id: str
    doctor_id: str
    specialty: str | None
    is_active: bool
    medications: list[dict[str, Any]] | None
    expected_recovery_date: datetime | None
    recovery_duration: str | None
    care_notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Recovery tasks ───────────────────────────────────

class CreateTaskBody(BaseModel):
    title: str
    description: str | None = None
    frequency: str | None = None
    due_date: str | None = None   # ISO datetime string


class UpdateTaskBody(BaseModel):
    title: str | None = None
    description: str | None = None
    frequency: str | None = None
    due_date: str | None = None
    is_active: bool | None = None


class CompleteTaskBody(BaseModel):
    completion_note: str | None = None


class TaskResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    patient_id: UUID
    title: str
    description: str | None
    frequency: str | None
    due_date: datetime | None
    is_active: bool
    status: str
    completed_at: datetime | None
    completion_note: str | None
    created_at: datetime
    updated_at: datetime
    doctor_name: str | None = None

    class Config:
        from_attributes = True
