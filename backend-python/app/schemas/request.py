"""
Doctor-patient request schemas.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.common import SafeUser


class SendRequestBody(BaseModel):
    to_email: EmailStr


class RequestResponse(BaseModel):
    id: UUID
    from_id: UUID
    to_id: UUID
    status: str
    created_at: datetime
    from_user: SafeUser | None = None
    to_user: SafeUser | None = None

    model_config = {"from_attributes": True}
