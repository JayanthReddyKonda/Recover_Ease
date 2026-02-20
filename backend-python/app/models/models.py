"""
SQLAlchemy ORM models — mirrors the Prisma schema from the Node.js backend.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Shared base for all models."""
    pass


# ── Enums ───────────────────────────────────────────

class Role(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"


class RequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EscalationStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


# ── Helpers ─────────────────────────────────────────

def _uuid() -> uuid.UUID:
    return uuid.uuid4()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── User ────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)

    # Patient-specific (nullable for doctors)
    surgery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    surgery_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caregiver_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Doctor-patient link
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationships
    doctor: Mapped[User | None] = relationship(
        "User", remote_side="User.id", foreign_keys=[doctor_id], lazy="selectin"
    )
    symptom_logs: Mapped[list[SymptomLog]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )
    escalations: Mapped[list[Escalation]] = relationship(
        back_populates="patient", cascade="all, delete-orphan",
        foreign_keys="Escalation.patient_id", lazy="selectin"
    )
    milestones: Mapped[list[Milestone]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", lazy="selectin"
    )

    # Requests sent by this user
    sent_requests: Mapped[list[DoctorPatientRequest]] = relationship(
        back_populates="from_user", foreign_keys="DoctorPatientRequest.from_id", lazy="selectin"
    )
    received_requests: Mapped[list[DoctorPatientRequest]] = relationship(
        back_populates="to_user", foreign_keys="DoctorPatientRequest.to_id", lazy="selectin"
    )


# ── DoctorPatientRequest ───────────────────────────

class DoctorPatientRequest(Base):
    __tablename__ = "doctor_patient_requests"
    __table_args__ = (
        UniqueConstraint("from_id", "to_id", name="uq_from_to"),
        Index("ix_dpr_to_status", "to_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    from_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    to_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[RequestStatus] = mapped_column(
        Enum(RequestStatus), default=RequestStatus.PENDING, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    from_user: Mapped[User] = relationship("User", foreign_keys=[from_id], back_populates="sent_requests", lazy="selectin")
    to_user: Mapped[User] = relationship("User", foreign_keys=[to_id], back_populates="received_requests", lazy="selectin")


# ── SymptomLog ──────────────────────────────────────

class SymptomLog(Base):
    __tablename__ = "symptom_logs"
    __table_args__ = (
        Index("ix_symptom_patient_date", "patient_id", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    # Numeric fields (1-10 scale unless noted)
    pain_level: Mapped[int] = mapped_column(Integer, nullable=False)
    fatigue_level: Mapped[int] = mapped_column(Integer, nullable=False)
    mood: Mapped[int] = mapped_column(Integer, nullable=False)
    sleep_hours: Mapped[float] = mapped_column(Float, nullable=False)
    appetite: Mapped[int] = mapped_column(Integer, nullable=False)
    energy: Mapped[int] = mapped_column(Integer, nullable=False)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Free text
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # AI-generated
    parsed_symptoms: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_insight: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    patient: Mapped[User] = relationship("User", back_populates="symptom_logs", lazy="selectin")
    escalation: Mapped[Escalation | None] = relationship(
        back_populates="symptom_log", uselist=False, lazy="selectin"
    )


# ── Escalation ─────────────────────────────────────

class Escalation(Base):
    __tablename__ = "escalations"
    __table_args__ = (
        Index("ix_escalation_patient_status", "patient_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    symptom_log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("symptom_logs.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    severity: Mapped[Severity] = mapped_column(Enum(Severity), nullable=False)
    status: Mapped[EscalationStatus] = mapped_column(
        Enum(EscalationStatus), default=EscalationStatus.OPEN, nullable=False
    )

    rule_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_verdict: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_sos: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    doctor_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[User] = relationship("User", foreign_keys=[patient_id], back_populates="escalations", lazy="selectin")
    symptom_log: Mapped[SymptomLog] = relationship("SymptomLog", back_populates="escalation", lazy="selectin")


# ── Milestone ───────────────────────────────────────

class Milestone(Base):
    __tablename__ = "milestones"
    __table_args__ = (
        UniqueConstraint("patient_id", "milestone_key", name="uq_patient_milestone"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_key: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    icon: Mapped[str] = mapped_column(String(10), nullable=False)

    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    patient: Mapped[User] = relationship("User", back_populates="milestones", lazy="selectin")
