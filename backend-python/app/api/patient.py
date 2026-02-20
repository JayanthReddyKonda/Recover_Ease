"""
Patient routes — profile, full view (doctor), SOS, escalation review.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import DbSession
from app.middleware.auth import DoctorUser, PatientUser
from app.schemas.common import ApiResponse
from app.schemas.patient import (
    EscalationResponse,
    ReviewEscalationRequest,
    SOSRequest,
)
from app.services import patient_service
from app.socket.manager import sio

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/me/profile")
async def get_my_profile(patient: PatientUser, db: DbSession):
    profile = await patient_service.get_patient_profile(db, patient)
    return ApiResponse(data=profile)


@router.get("/{patient_id}/full")
async def get_patient_full(patient_id: UUID, doctor: DoctorUser, db: DbSession):
    full = await patient_service.get_patient_full(db, doctor, patient_id)
    return ApiResponse(data=full)


@router.post("/sos", response_model=ApiResponse[EscalationResponse])
async def trigger_sos(body: SOSRequest, patient: PatientUser, db: DbSession):
    escalation = await patient_service.trigger_sos(db, patient, body.notes, sio=sio)
    return ApiResponse(data=EscalationResponse.model_validate(escalation))


@router.patch("/escalations/{escalation_id}", response_model=ApiResponse[EscalationResponse])
async def review_escalation(
    escalation_id: UUID,
    body: ReviewEscalationRequest,
    doctor: DoctorUser,
    db: DbSession,
):
    esc = await patient_service.review_escalation(
        db, doctor, escalation_id, body.status, body.notes
    )
    return ApiResponse(data=EscalationResponse.model_validate(esc))
