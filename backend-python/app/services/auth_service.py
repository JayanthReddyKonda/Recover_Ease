"""
Auth service — register, login, get_me, update_profile.
"""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.middleware.error_handler import AppError
from app.models.models import Role, User
from app.schemas.auth import LoginRequest, ProfileUpdateRequest, RegisterRequest
from app.schemas.common import SafeUser


async def register(db: AsyncSession, data: RegisterRequest) -> dict:
    """Create a new user account."""
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise AppError("Email already registered", 409)

    # Prevent two users sharing the same WhatsApp number
    if data.whatsapp_phone:
        phone_check = await db.execute(
            select(User).where(User.whatsapp_phone == data.whatsapp_phone)
        )
        if phone_check.scalar_one_or_none():
            raise AppError("WhatsApp number already linked to another account", 409)

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role=Role(data.role),
        whatsapp_phone=data.whatsapp_phone or None,
        surgery_date=data.surgery_date,
        surgery_type=data.surgery_type,
        caregiver_email=data.caregiver_email,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(str(user.id), user.role.value)
    return {"user": SafeUser.model_validate(user), "token": token}


async def login(db: AsyncSession, data: LoginRequest) -> dict:
    """Authenticate and return JWT."""
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise AppError("Invalid email or password", 401)

    token = create_access_token(str(user.id), user.role.value)
    return {"user": SafeUser.model_validate(user), "token": token}


async def get_me(user: User) -> SafeUser:
    """Return the current user's safe profile."""
    return SafeUser.model_validate(user)


async def update_profile(db: AsyncSession, user: User, data: ProfileUpdateRequest) -> SafeUser:
    """Update mutable profile fields."""
    update_data = data.model_dump(exclude_unset=True)

    # Prevent stealing another account's WhatsApp number
    new_phone = update_data.get("whatsapp_phone")
    if new_phone and new_phone != user.whatsapp_phone:
        conflict = await db.execute(
            select(User).where(User.whatsapp_phone == new_phone)
        )
        if conflict.scalar_one_or_none():
            raise AppError("WhatsApp number already linked to another account", 409)

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    await db.refresh(user)
    return SafeUser.model_validate(user)
