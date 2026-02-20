"""
Auth routes -- register, login, me, update profile.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import DbSession
from app.middleware.auth import CurrentUser
from app.schemas.auth import AuthResponse, LoginRequest, ProfileUpdateRequest, RegisterRequest
from app.schemas.common import ApiResponse, SafeUser
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=ApiResponse[AuthResponse])
async def register(body: RegisterRequest, db: DbSession):
    result = await auth_service.register(db, body)
    return ApiResponse(data=result)


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(body: LoginRequest, db: DbSession):
    result = await auth_service.login(db, body)
    return ApiResponse(data=result)


@router.get("/me", response_model=ApiResponse[SafeUser])
async def get_me(current_user: CurrentUser):
    result = await auth_service.get_me(current_user)
    return ApiResponse(data=result)


@router.patch("/profile", response_model=ApiResponse[SafeUser])
async def update_profile(body: ProfileUpdateRequest, current_user: CurrentUser, db: DbSession):
    result = await auth_service.update_profile(db, current_user, body)
    return ApiResponse(data=result)
