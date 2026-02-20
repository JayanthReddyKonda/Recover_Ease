"""
Doctor-patient request schemas.
"""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, model_validator

from app.schemas.common import SafeUser


class SendRequestBody(BaseModel):
    """Send by email OR connect_code — at least one must be provided."""
    to_email: EmailStr | None = None
    connect_code: str | None = None
    specialty: str | None = None  # optional label for this connection

    @model_validator(mode="after")
    def _require_one(self) -> "SendRequestBody":
        if not self.to_email and not self.connect_code:
            raise ValueError("Provide either to_email or connect_code")
        return self


class RequestResponse(BaseModel):
    id: UUID
    from_id: UUID
    to_id: UUID
    status: str
    specialty: str | None = None
    created_at: datetime
    from_user: SafeUser | None = None
    to_user: SafeUser | None = None

    model_config = {"from_attributes": True}
