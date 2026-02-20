"""
Care-plan & recovery-task API router.

Doctor endpoints (require DoctorUser):
  GET    /care-plan/{patient_id}               → get current care plan
  PUT    /care-plan/{patient_id}               → update prescription / recovery date
  GET    /care-plan/{patient_id}/tasks         → list this doctor's tasks for patient
  POST   /care-plan/{patient_id}/tasks         → create a new task
  PUT    /care-plan/{patient_id}/tasks/{tid}   → edit task
  DELETE /care-plan/{patient_id}/tasks/{tid}   → delete task

Patient endpoints (require PatientUser):
  GET    /care-plan/my                         → all care plans from all doctors
  GET    /care-plan/my/tasks                   → all active tasks assigned to me
  POST   /care-plan/my/tasks/{tid}/complete    → mark task done
  POST   /care-plan/my/tasks/{tid}/undo        → un-mark task
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import DbSession
from app.middleware.auth import DoctorUser, PatientUser
from app.models.models import DoctorPatient
from app.schemas.care_plan import (
    CarePlanResponse,
    CompleteTaskBody,
    CreateTaskBody,
    TaskResponse,
    UpdateCarePlanBody,
    UpdateTaskBody,
)
from app.schemas.common import ApiResponse
from app.services import care_plan_service

router = APIRouter(prefix="/care-plan", tags=["Care Plan"])


# ─── helpers ────────────────────────────────────────

def _link_to_response(link: DoctorPatient) -> CarePlanResponse:
    return CarePlanResponse(
        patient_id=str(link.patient_id),
        doctor_id=str(link.doctor_id),
        specialty=link.specialty,
        is_active=link.is_active,
        medications=link.medications,
        expected_recovery_date=link.expected_recovery_date,
        recovery_duration=link.recovery_duration,
        care_notes=link.care_notes,
        created_at=link.created_at,
    )


# ─── Doctor: care plan management ───────────────────

@router.get("/{patient_id}", response_model=ApiResponse[CarePlanResponse])
async def get_care_plan(patient_id: UUID, doctor: DoctorUser, db: DbSession):
    link = await care_plan_service.get_care_plan(db, doctor.id, patient_id)
    if not link:
        return ApiResponse(data=None, message="No care plan found")
    return ApiResponse(data=_link_to_response(link))


@router.put("/{patient_id}", response_model=ApiResponse[CarePlanResponse])
async def update_care_plan(
    patient_id: UUID,
    body: UpdateCarePlanBody,
    doctor: DoctorUser,
    db: DbSession,
):
    """Update prescription medications, expected recovery date, and/or recovery duration."""
    link = await care_plan_service.update_care_plan(db, doctor, patient_id, body)
    return ApiResponse(data=_link_to_response(link), message="Care plan updated")


@router.get("/{patient_id}/tasks", response_model=ApiResponse[list[TaskResponse]])
async def list_doctor_tasks(patient_id: UUID, doctor: DoctorUser, db: DbSession):
    tasks = await care_plan_service.list_tasks(db, patient_id, doctor_id=doctor.id, active_only=False)
    return ApiResponse(data=[care_plan_service._task_to_out(t) for t in tasks])


@router.post("/{patient_id}/tasks", response_model=ApiResponse[TaskResponse])
async def create_task(patient_id: UUID, body: CreateTaskBody, doctor: DoctorUser, db: DbSession):
    task = await care_plan_service.create_task(db, doctor, patient_id, body)
    return ApiResponse(data=care_plan_service._task_to_out(task), message="Task created")


@router.put("/{patient_id}/tasks/{task_id}", response_model=ApiResponse[TaskResponse])
async def update_task(
    patient_id: UUID, task_id: UUID, body: UpdateTaskBody, doctor: DoctorUser, db: DbSession
):
    task = await care_plan_service.update_task(db, doctor, task_id, body)
    return ApiResponse(data=care_plan_service._task_to_out(task), message="Task updated")


@router.delete("/{patient_id}/tasks/{task_id}", response_model=ApiResponse[None])
async def delete_task(patient_id: UUID, task_id: UUID, doctor: DoctorUser, db: DbSession):
    await care_plan_service.delete_task(db, doctor, task_id)
    return ApiResponse(data=None, message="Task deleted")


# ─── Patient: view + complete tasks ─────────────────

@router.get("/my/plans", response_model=ApiResponse[list[CarePlanResponse]])
async def get_my_care_plans(patient: PatientUser, db: DbSession):
    """Patient sees care plans from all their doctors."""
    links = await care_plan_service.get_patient_care_plan_for_patient(db, patient.id)
    return ApiResponse(data=[_link_to_response(l) for l in links])


@router.get("/my/tasks", response_model=ApiResponse[list[TaskResponse]])
async def get_my_tasks(patient: PatientUser, db: DbSession):
    tasks = await care_plan_service.list_tasks(db, patient.id, active_only=True)
    return ApiResponse(data=[care_plan_service._task_to_out(t) for t in tasks])


@router.post("/my/tasks/{task_id}/complete", response_model=ApiResponse[TaskResponse])
async def complete_task(task_id: UUID, body: CompleteTaskBody, patient: PatientUser, db: DbSession):
    task = await care_plan_service.complete_task(db, patient, task_id, body)
    return ApiResponse(data=care_plan_service._task_to_out(task), message="Task completed!")


@router.post("/my/tasks/{task_id}/undo", response_model=ApiResponse[TaskResponse])
async def undo_task(task_id: UUID, patient: PatientUser, db: DbSession):
    task = await care_plan_service.undo_task(db, patient, task_id)
    return ApiResponse(data=care_plan_service._task_to_out(task), message="Task reset to pending")
