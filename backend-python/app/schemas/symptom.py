"""
Symptom log schemas.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class LogSymptomRequest(BaseModel):
    pain_level: int = Field(ge=1, le=10)
    fatigue_level: int = Field(ge=1, le=10)
    mood: int = Field(ge=1, le=10)
    sleep_hours: float = Field(ge=0, le=24)
    appetite: int = Field(ge=1, le=10)
    energy: int = Field(ge=1, le=10)
    temperature: float | None = Field(None, ge=35.0, le=42.0)
    notes: str | None = Field(None, max_length=2000)


class SymptomLogResponse(BaseModel):
    id: UUID
    patient_id: UUID
    date: datetime
    pain_level: int
    fatigue_level: int
    mood: int
    sleep_hours: float
    appetite: int
    energy: int
    temperature: float | None
    notes: str | None
    parsed_symptoms: dict[str, Any] | None
    ai_insight: dict[str, Any] | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SymptomTrendPoint(BaseModel):
    date: str
    pain_level: int
    fatigue_level: int
    mood: int
    sleep_hours: float
    appetite: int
    energy: int


class SymptomSummary(BaseModel):
    total_logs: int
    avg_pain: float
    avg_mood: float
    avg_energy: float
    avg_sleep: float
    trend: list[SymptomTrendPoint]
