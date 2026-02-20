"""
Auth-related Pydantic schemas.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import SafeUser


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=100)
    role: str = Field(pattern="^(PATIENT|DOCTOR)$")
    # Phone number for WhatsApp bot — works for both patients and doctors
    # E.164 format: +919876543210  (optional but recommended)
    whatsapp_phone: str | None = Field(None, pattern=r"^\+[1-9]\d{6,19}$")
    surgery_date: datetime | None = None
    surgery_type: str | None = None
    caregiver_email: EmailStr | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user: SafeUser
    token: str


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    surgery_date: datetime | None = None
    surgery_type: str | None = None
    caregiver_email: EmailStr | None = None
    whatsapp_phone: str | None = Field(None, pattern=r"^\+[1-9]\d{6,19}$|^$")
