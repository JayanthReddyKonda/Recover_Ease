"""
Care-plan service — update prescriptions, set expected recovery, manage recovery tasks.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.models import (
    DoctorPatient,
    RecoveryTask,
    RecoveryTaskStatus,
    Role,
    User,
)
from app.schemas.care_plan import (
    CompleteTaskBody,
    CreateTaskBody,
    TaskResponse,
    UpdateCarePlanBody,
    UpdateTaskBody,
)


# ─── helpers ────────────────────────────────────────

def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    formats = ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%f"]
    for fmt in formats:
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise AppError(f"Cannot parse date: {value!r}. Use YYYY-MM-DD format.", 422)


def _task_to_out(task: RecoveryTask) -> TaskResponse:
    return TaskResponse(
        id=task.id,
        doctor_id=task.doctor_id,
        patient_id=task.patient_id,
        title=task.title,
        description=task.description,
        frequency=task.frequency,
        due_date=task.due_date,
        is_active=task.is_active,
        status=task.status.value,
        completed_at=task.completed_at,
        completion_note=task.completion_note,
        created_at=task.created_at,
        updated_at=task.updated_at,
        doctor_name=task.doctor.name if task.doctor else None,
    )


async def _get_link(db: AsyncSession, doctor_id: UUID, patient_id: UUID) -> DoctorPatient:
    result = await db.execute(
        select(DoctorPatient).where(
            and_(
                DoctorPatient.doctor_id == doctor_id,
                DoctorPatient.patient_id == patient_id,
            )
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise AppError("No active doctor-patient relationship found", 404)
    return link


# ─── care plan (prescription + recovery date) ───────

async def update_care_plan(
    db: AsyncSession,
    doctor: User,
    patient_id: UUID,
    body: UpdateCarePlanBody,
) -> DoctorPatient:
    link = await _get_link(db, doctor.id, patient_id)

    if body.medications is not None:
        link.medications = [m.model_dump() for m in body.medications]  # type: ignore[assignment]
    if body.expected_recovery_date is not None:
        link.expected_recovery_date = _parse_date(body.expected_recovery_date)
    if body.recovery_duration is not None:
        link.recovery_duration = body.recovery_duration
    if body.care_notes is not None:
        link.care_notes = body.care_notes

    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def get_care_plan(
    db: AsyncSession,
    doctor_id: UUID,
    patient_id: UUID,
) -> DoctorPatient | None:
    result = await db.execute(
        select(DoctorPatient).where(
            and_(
                DoctorPatient.doctor_id == doctor_id,
                DoctorPatient.patient_id == patient_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_patient_care_plan_for_patient(
    db: AsyncSession,
    patient_id: UUID,
) -> list[DoctorPatient]:
    """Return all active care plans for a patient (from all their doctors)."""
    result = await db.execute(
        select(DoctorPatient).where(
            DoctorPatient.patient_id == patient_id,
        )
    )
    return list(result.scalars().all())


# ─── recovery tasks ──────────────────────────────────

async def create_task(
    db: AsyncSession,
    doctor: User,
    patient_id: UUID,
    body: CreateTaskBody,
) -> RecoveryTask:
    # ensure doctor-patient link exists
    await _get_link(db, doctor.id, patient_id)

    task = RecoveryTask(
        doctor_id=doctor.id,
        patient_id=patient_id,
        title=body.title,
        description=body.description,
        frequency=body.frequency,
        due_date=_parse_date(body.due_date),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def list_tasks(
    db: AsyncSession,
    patient_id: UUID,
    doctor_id: UUID | None = None,
    active_only: bool = True,
) -> list[RecoveryTask]:
    conditions = [RecoveryTask.patient_id == patient_id]
    if doctor_id:
        conditions.append(RecoveryTask.doctor_id == doctor_id)
    if active_only:
        conditions.append(RecoveryTask.is_active == True)  # noqa: E712

    result = await db.execute(
        select(RecoveryTask)
        .where(and_(*conditions))
        .order_by(RecoveryTask.created_at.desc())
    )
    return list(result.scalars().all())


async def update_task(
    db: AsyncSession,
    doctor: User,
    task_id: UUID,
    body: UpdateTaskBody,
) -> RecoveryTask:
    result = await db.execute(
        select(RecoveryTask).where(
            and_(RecoveryTask.id == task_id, RecoveryTask.doctor_id == doctor.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise AppError("Task not found", 404)

    if body.title is not None:
        task.title = body.title
    if body.description is not None:
        task.description = body.description
    if body.frequency is not None:
        task.frequency = body.frequency
    if body.due_date is not None:
        task.due_date = _parse_date(body.due_date)
    if body.is_active is not None:
        task.is_active = body.is_active

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, doctor: User, task_id: UUID) -> None:
    result = await db.execute(
        select(RecoveryTask).where(
            and_(RecoveryTask.id == task_id, RecoveryTask.doctor_id == doctor.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise AppError("Task not found", 404)
    await db.delete(task)
    await db.commit()


async def complete_task(
    db: AsyncSession,
    patient: User,
    task_id: UUID,
    body: CompleteTaskBody,
) -> RecoveryTask:
    result = await db.execute(
        select(RecoveryTask).where(
            and_(RecoveryTask.id == task_id, RecoveryTask.patient_id == patient.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise AppError("Task not found", 404)

    task.status = RecoveryTaskStatus.COMPLETED
    task.completed_at = datetime.now(timezone.utc)
    task.completion_note = body.completion_note

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def undo_task(db: AsyncSession, patient: User, task_id: UUID) -> RecoveryTask:
    result = await db.execute(
        select(RecoveryTask).where(
            and_(RecoveryTask.id == task_id, RecoveryTask.patient_id == patient.id)
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise AppError("Task not found", 404)

    task.status = RecoveryTaskStatus.PENDING
    task.completed_at = None
    task.completion_note = None

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task
