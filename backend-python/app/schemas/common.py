"""
Shared / common schemas used across multiple endpoints.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T | None = None
    message: str | None = None


class ApiError(BaseModel):
    success: bool = False
    error: str
    code: int | None = None


class SafeUser(BaseModel):
    """User data safe to return to clients (no password hash)."""
    id: UUID
    email: str
    name: str
    role: str
    connect_code: str
    surgery_date: datetime | None = None
    surgery_type: str | None = None
    caregiver_email: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DoctorLink(BaseModel):
    """A doctor linked to a patient (from DoctorPatient junction)."""
    link_id: UUID
    doctor_id: UUID
    patient_id: UUID
    specialty: str | None = None
    created_at: datetime
    doctor: SafeUser | None = None
    patient: SafeUser | None = None

    model_config = {"from_attributes": True}
