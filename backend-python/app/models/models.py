"""
SQLAlchemy ORM models.
"""

from __future__ import annotations

import enum
import random
import string
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


class ChatSessionStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"   # patient requested chat with a past (inactive) doctor
    ACTIVE = "ACTIVE"         # both parties can exchange messages
    CLOSED = "CLOSED"


class RecoveryTaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


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


def _connect_code() -> str:
    """Generate a unique 6-character alphanumeric connect code."""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ── User ────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False)

    # Short connect code for easy doctor-patient linking (e.g. "A3B9X2")
    connect_code: Mapped[str] = mapped_column(
        String(10), unique=True, nullable=False, default=_connect_code, index=True
    )

    # Patient-specific (nullable for doctors)
    surgery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    surgery_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caregiver_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    # Relationships
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

    # Many-to-many doctor ↔ patient links
    doctor_links: Mapped[list[DoctorPatient]] = relationship(
        "DoctorPatient", foreign_keys="DoctorPatient.patient_id",
        back_populates="patient", lazy="selectin", cascade="all, delete-orphan"
    )
    patient_links: Mapped[list[DoctorPatient]] = relationship(
        "DoctorPatient", foreign_keys="DoctorPatient.doctor_id",
        back_populates="doctor", lazy="selectin", cascade="all, delete-orphan"
    )

    # Connection requests
    sent_requests: Mapped[list[DoctorPatientRequest]] = relationship(
        back_populates="from_user", foreign_keys="DoctorPatientRequest.from_id", lazy="selectin"
    )
    received_requests: Mapped[list[DoctorPatientRequest]] = relationship(
        back_populates="to_user", foreign_keys="DoctorPatientRequest.to_id", lazy="selectin"
    )


# ── DoctorPatient (junction) ────────────────────────

class DoctorPatient(Base):
    """Many-to-many link between a doctor and patient. A patient can have multiple doctors."""
    __tablename__ = "doctor_patient_links"
    __table_args__ = (
        UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient_link"),
        Index("ix_dpl_patient", "patient_id"),
        Index("ix_dpl_doctor", "doctor_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # Optional label — e.g. "Orthopedic Surgery", "Physiotherapy"
    specialty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # True = patient is still under active treatment by this doctor
    # False = patient has fully recovered / treatment completed
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Current prescription / medication plan (JSON list of MedicationInput dicts)
    medications: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Expected date the patient will fully recover
    expected_recovery_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Textual recovery duration the doctor sets, e.g. "6 weeks" or "3 months"
    recovery_duration: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Additional doctor notes on this care relationship
    care_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    doctor: Mapped[User] = relationship("User", foreign_keys=[doctor_id], back_populates="patient_links", lazy="selectin")
    patient: Mapped[User] = relationship("User", foreign_keys=[patient_id], back_populates="doctor_links", lazy="selectin")


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

    # ── Clinical context filled by the doctor when sending the request ──
    specialty: Mapped[str | None] = mapped_column(String(255), nullable=True)
    visit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    disease_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # List of {name, dosage, frequency, time_of_day} dicts
    medications: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # AI-structured care plan built from the above fields
    ai_structured_plan: Mapped[dict | None] = mapped_column(JSON, nullable=True)

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
    doctor: Mapped[User | None] = relationship("User", foreign_keys=[doctor_id], lazy="selectin")


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


# ── ChatSession ─────────────────────────────────────

class ChatSession(Base):
    """A conversation thread between a patient and a doctor (or AI)."""
    __tablename__ = "chat_sessions"
    __table_args__ = (
        Index("ix_chat_session_patient", "patient_id"),
        Index("ix_chat_session_doctor", "doctor_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # null = AI-only session
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[ChatSessionStatus] = mapped_column(
        Enum(ChatSessionStatus), default=ChatSessionStatus.ACTIVE, nullable=False
    )
    # title shown in the sidebar (e.g. "Dr. Smith — Orthopedics" or "AI Assistant")
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Chat")
    # True → was opened by the patient as a re-connect request to a past (inactive) doctor
    is_request: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    patient: Mapped[User] = relationship("User", foreign_keys=[patient_id], lazy="selectin")
    doctor: Mapped[User | None] = relationship("User", foreign_keys=[doctor_id], lazy="selectin")
    messages: Mapped[list["ChatMessage"]] = relationship(
        back_populates="session", cascade="all, delete-orphan", lazy="selectin",
        order_by="ChatMessage.created_at"
    )


# ── ChatMessage ─────────────────────────────────────

class ChatMessage(Base):
    """A single message inside a ChatSession."""
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_message_session", "session_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    # null sender = AI message
    sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_ai: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # voice_transcript = True if this message came from the voice input feature
    is_voice: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # base64 data-URL of the recorded audio (e.g. "data:audio/webm;base64,...")
    audio_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # base64 data-URL of an attached image (e.g. "data:image/jpeg;base64,...")
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)

    session: Mapped[ChatSession] = relationship(back_populates="messages", lazy="selectin")
    sender: Mapped[User | None] = relationship("User", foreign_keys=[sender_id], lazy="selectin")


# ── RecoveryTask ─────────────────────────────────────

class RecoveryTask(Base):
    """
    A custom recovery task assigned by a doctor to their patient.
    Examples: "Walk 10 minutes daily", "Eat only vegetables for lunch", "Ice knee 3x/day".
    """
    __tablename__ = "recovery_tasks"
    __table_args__ = (
        Index("ix_rt_patient", "patient_id"),
        Index("ix_rt_doctor", "doctor_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    doctor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Frequency text — e.g. "Daily", "Twice a day", "3x per week"
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Optional specific deadline for this task
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Task is active (visible to patient); doctor can deactivate without deleting
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    status: Mapped[RecoveryTaskStatus] = mapped_column(
        Enum(RecoveryTaskStatus), default=RecoveryTaskStatus.PENDING, nullable=False
    )
    # When the patient marked it complete
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Patient's optional note when completing
    completion_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    doctor: Mapped[User] = relationship("User", foreign_keys=[doctor_id], lazy="selectin")
    patient: Mapped[User] = relationship("User", foreign_keys=[patient_id], lazy="selectin")
