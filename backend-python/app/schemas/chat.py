"""Pydantic schemas for the chat feature."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class MessageOut(BaseModel):
    id: UUID
    session_id: UUID
    sender_id: UUID | None
    content: str
    is_ai: bool
    is_voice: bool
    audio_url: str | None = None
    image_url: str | None = None
    created_at: datetime
    sender_name: str | None = None

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID | None
    status: str
    title: str
    is_request: bool
    created_at: datetime
    updated_at: datetime
    last_message: str | None = None
    unread: int = 0

    model_config = {"from_attributes": True}


class SendMessageIn(BaseModel):
    content: str
    is_voice: bool = False


class CreateSessionIn(BaseModel):
    doctor_id: UUID  # patient is requesting chat with a past doctor


class AIMessageIn(BaseModel):
    session_id: UUID
    content: str
    is_voice: bool = False
