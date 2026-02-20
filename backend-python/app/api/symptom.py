"""
Symptom log routes.
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import DbSession
from app.middleware.auth import PatientUser
from app.schemas.common import ApiResponse
from app.schemas.symptom import LogSymptomRequest, SymptomLogResponse
from app.services import symptom_service
from app.socket.manager import sio

router = APIRouter(prefix="/symptoms", tags=["Symptoms"])


@router.post("", response_model=ApiResponse[SymptomLogResponse])
async def log_symptoms(body: LogSymptomRequest, patient: PatientUser, db: DbSession):
    log = await symptom_service.log_symptoms(db, patient.id, body, sio=sio)
    return ApiResponse(data=SymptomLogResponse.model_validate(log))


@router.get("", response_model=ApiResponse[list[SymptomLogResponse]])
async def get_logs(
    patient: PatientUser,
    db: DbSession,
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    logs = await symptom_service.get_logs(db, patient.id, limit, offset)
    return ApiResponse(data=[SymptomLogResponse.model_validate(l) for l in logs])


@router.get("/today", response_model=ApiResponse[SymptomLogResponse | None])
async def get_today_log(patient: PatientUser, db: DbSession):
    log = await symptom_service.get_today_log(db, patient.id)
    return ApiResponse(data=SymptomLogResponse.model_validate(log) if log else None)


@router.get("/summary")
async def get_symptom_summary(patient: PatientUser, db: DbSession):
    summary = await symptom_service.get_symptom_summary(db, patient.id)
    return ApiResponse(data=summary)


@router.get("/trend")
async def get_symptom_trend(
    patient: PatientUser,
    db: DbSession,
    days: int = Query(14, ge=1, le=90),
):
    trend = await symptom_service.get_symptom_trend(db, patient.id, days)
    return ApiResponse(data=trend)
