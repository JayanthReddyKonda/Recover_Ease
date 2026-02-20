"""
Doctor-patient request routes.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.middleware.auth import CurrentUser, DoctorUser, PatientUser
from app.schemas.common import ApiResponse, DoctorLink, SafeUser
from app.schemas.request import RequestResponse, SendRequestBody
from app.services import request_service

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.post("", response_model=ApiResponse[RequestResponse])
async def send_request(body: SendRequestBody, doctor: DoctorUser, db: DbSession):
    """Only doctors can send connection requests, with full clinical context."""
    req = await request_service.send_request(
        db, doctor,
        to_email=body.to_email,
        connect_code=body.connect_code,
        specialty=body.specialty,
        visit_date=body.visit_date,
        disease_description=body.disease_description,
        medications=[m.model_dump() for m in body.medications],
    )
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


@router.get("/my-doctors", response_model=ApiResponse[list[DoctorLink]])
async def get_my_doctors(patient: PatientUser, db: DbSession):
    """Return all doctors linked to the current patient."""
    doctors = await request_service.get_my_doctors(db, patient)
    return ApiResponse(data=doctors)


@router.get("/my-patients", response_model=ApiResponse[list[SafeUser]])
async def get_my_patients(doctor: DoctorUser, db: DbSession):
    patients = await request_service.get_my_patients(db, doctor)
    return ApiResponse(data=patients)


@router.get("/lookup", response_model=ApiResponse[SafeUser])
async def lookup_by_code(
    code: str = Query(..., description="6-character connect code"),
    user: CurrentUser = None,
    db: DbSession = None,
):
    """Look up any user by their connect code (for sending connection requests)."""
    profile = await request_service.lookup_user_by_code(db, code)
    return ApiResponse(data=profile)


@router.delete("/{other_id}/disconnect")
async def disconnect(other_id: UUID, user: CurrentUser, db: DbSession):
    await request_service.disconnect(db, user, other_id)
    return ApiResponse(message="Disconnected successfully")
