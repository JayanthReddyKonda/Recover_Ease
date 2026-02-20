"""
Doctor-patient request schemas.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, model_validator

from app.schemas.common import SafeUser


class MedicationInput(BaseModel):
    """A single medication entry provided by the doctor."""
    name: str
    dosage: str = ""
    frequency: str = ""   # e.g. "twice daily"
    time_of_day: str = "" # e.g. "morning, evening"
    instructions: str = ""


class SendRequestBody(BaseModel):
    """
    Doctors-only: send a connection request to a patient.
    Patient is identified by email OR connect_code.
    """
    to_email: EmailStr | None = None
    connect_code: str | None = None
    specialty: str | None = None

    # Clinical context
    visit_date: str | None = None          # ISO date or human string
    disease_description: str              # required — reason for connecting
    medications: list[MedicationInput] = []

    @model_validator(mode="after")
    def _require_one(self) -> "SendRequestBody":
        if not self.to_email and not self.connect_code:
            raise ValueError("Provide either to_email or connect_code")
        if not self.disease_description.strip():
            raise ValueError("disease_description is required")
        return self


class RequestResponse(BaseModel):
    id: UUID
    from_id: UUID
    to_id: UUID
    status: str
    specialty: str | None = None
    # Clinical fields
    visit_date: datetime | None = None
    disease_description: str | None = None
    medications: list[dict] | None = None
    ai_structured_plan: dict | None = None
    created_at: datetime
    from_user: SafeUser | None = None
    to_user: SafeUser | None = None

    model_config = {"from_attributes": True}
