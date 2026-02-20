"""
Doctor-patient request routes.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import DbSession
from app.middleware.auth import CurrentUser, DoctorUser, PatientUser
from app.schemas.common import ApiResponse, SafeUser
from app.schemas.request import RequestResponse, SendRequestBody
from app.services import request_service

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.post("", response_model=ApiResponse[RequestResponse])
async def send_request(body: SendRequestBody, user: CurrentUser, db: DbSession):
    req = await request_service.send_request(db, user, body.to_email)
    return ApiResponse(data=RequestResponse.model_validate(req))


@router.get("/pending", response_model=ApiResponse[list[RequestResponse]])
async def get_pending(user: CurrentUser, db: DbSession):
    requests = await request_service.get_pending_requests(db, user)
    return ApiResponse(data=[RequestResponse.model_validate(r) for r in requests])


@router.post("/{request_id}/accept", response_model=ApiResponse[RequestResponse])
async def accept_request(request_id: UUID, user: CurrentUser, db: DbSession):
    req = await request_service.accept_request(db, user, request_id)
    return ApiResponse(data=RequestResponse.model_validate(req))


@router.post("/{request_id}/reject", response_model=ApiResponse[RequestResponse])
async def reject_request(request_id: UUID, user: CurrentUser, db: DbSession):
    req = await request_service.reject_request(db, user, request_id)
    return ApiResponse(data=RequestResponse.model_validate(req))


@router.get("/my-doctor", response_model=ApiResponse[SafeUser | None])
async def get_my_doctor(patient: PatientUser, db: DbSession):
    doctor = await request_service.get_my_doctor(db, patient)
    return ApiResponse(data=doctor)


@router.get("/my-patients", response_model=ApiResponse[list[SafeUser]])
async def get_my_patients(doctor: DoctorUser, db: DbSession):
    patients = await request_service.get_my_patients(db, doctor)
    return ApiResponse(data=patients)


@router.delete("/{other_id}/disconnect")
async def disconnect(other_id: UUID, user: CurrentUser, db: DbSession):
    await request_service.disconnect(db, user, other_id)
    return ApiResponse(message="Disconnected successfully")
