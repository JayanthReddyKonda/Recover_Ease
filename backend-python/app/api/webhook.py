"""
WhatsApp Webhook — Meta Cloud API integration.

Webhook endpoints:
  GET  /api/webhook/whatsapp  — Meta verification challenge
  POST /api/webhook/whatsapp  — Receive incoming WhatsApp messages

Flow when a patient messages the bot number:
  1. Parse free-text into structured symptom data via Groq
  2. Save as SymptomLog (runs escalation engine + milestone checks internally)
  3. Reply to patient with a friendly confirmation
  4. If escalation was created → also send WhatsApp alert to linked doctors

Environment variables needed:
  WHATSAPP_TOKEN            — Meta access token
  WHATSAPP_PHONE_NUMBER_ID  — Phone Number ID from Meta developer console
  WHATSAPP_VERIFY_TOKEN     — any string you set in Meta webhook configuration
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.api.deps import DbSession
from app.core.config import settings
from app.core.logger import logger
from app.models.models import Escalation, Role, User
from app.schemas.symptom import LogSymptomRequest
from app.services import groq_service, symptom_service, whatsapp_service

router = APIRouter(prefix="/webhook", tags=["Webhook"])


# ─────────────────────────────────────────────────────────────────
# GET /webhook/whatsapp — Meta webhook verification
# ─────────────────────────────────────────────────────────────────

@router.get("/whatsapp")
async def verify_whatsapp_webhook(request: Request) -> PlainTextResponse:
    """
    Meta sends a GET with hub.mode, hub.verify_token, hub.challenge.
    Respond with hub.challenge to confirm ownership of the webhook URL.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.whatsapp_verify_token:
        logger.info("whatsapp_webhook_verified")
        return PlainTextResponse(content=challenge or "", status_code=200)

    logger.warning("whatsapp_webhook_verify_failed", mode=mode)
    raise HTTPException(status_code=403, detail="Webhook verification failed")


# ─────────────────────────────────────────────────────────────────
# POST /webhook/whatsapp — receive incoming messages
# ─────────────────────────────────────────────────────────────────

@router.post("/whatsapp", status_code=200)
async def receive_whatsapp_message(request: Request, db: DbSession) -> dict[str, Any]:
    """
    Handle incoming WhatsApp messages from Meta Cloud API.
    Always returns HTTP 200 to prevent Meta from retrying.
    """
    try:
        body = await request.json()
    except Exception:
        # Even malformed payload → 200 so Meta doesn't retry forever
        return {"status": "ignored"}

    try:
        await _process_webhook_payload(body, db)
    except Exception as exc:
        # Log but don't raise — Meta MUST receive 200
        logger.error("whatsapp_webhook_process_error", error=str(exc))

    return {"status": "ok"}


# ─────────────────────────────────────────────────────────────────
# Internal processing
# ─────────────────────────────────────────────────────────────────

async def _process_webhook_payload(body: dict, db: DbSession) -> None:
    """Extract messages from the Meta webhook payload and handle each one."""
    entries = body.get("entry", [])
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            for msg in messages:
                if msg.get("type") != "text":
                    # Skip media, templates, reactions, etc. for now
                    continue
                from_phone: str = msg.get("from", "")
                text_body: str = msg.get("text", {}).get("body", "").strip()
                if from_phone and text_body:
                    await _handle_text_message(from_phone, text_body, db)


async def _handle_text_message(raw_phone: str, text: str, db: DbSession) -> None:
    """
    Core handler for a single text message from a patient.
    Normalises phone → E.164 (+prefix), looks up patient, logs symptoms,
    checks escalation, and sends WhatsApp replies.
    """
    # Meta sends phone without '+', e.g. "919876543210" → "+919876543210"
    phone = raw_phone if raw_phone.startswith("+") else f"+{raw_phone}"

    # ── Look up patient by WhatsApp phone ──────────────────────────
    result = await db.execute(
        select(User).where(User.whatsapp_phone == phone, User.role == Role.PATIENT)
    )
    patient = result.scalar_one_or_none()

    if not patient:
        await whatsapp_service.send_text(
            phone,
            (
                "👋 Hi! Your WhatsApp number isn't linked to a Recovery Companion account yet.\n"
                "Open the app → Profile → enter this number to enable WhatsApp logging."
            ),
        )
        logger.info("whatsapp_unknown_patient", phone_prefix=phone[:6])
        return

    # ── Parse free-text message with Groq ─────────────────────────
    parsed = await groq_service.parse_whatsapp_message(text)
    logger.info(
        "whatsapp_message_parsed",
        patient_id=str(patient.id),
        parsed_fields=parsed.get("parsed_fields", []),
    )

    # ── Build & save SymptomLog ────────────────────────────────────
    log_data = LogSymptomRequest(
        pain_level=parsed["pain_level"],
        fatigue_level=parsed["fatigue_level"],
        mood=parsed["mood"],
        sleep_hours=parsed["sleep_hours"],
        appetite=parsed["appetite"],
        energy=parsed["energy"],
        temperature=None,
        notes=parsed.get("notes") or text,
    )

    # log_symptoms runs escalation + milestone checks internally
    log = await symptom_service.log_symptoms(db, patient.id, log_data, sio=None)

    # ── Check if an escalation was created for this log ────────────
    esc_result = await db.execute(
        select(Escalation).where(Escalation.symptom_log_id == log.id)
    )
    escalation = esc_result.scalar_one_or_none()
    escalated = escalation is not None

    # ── Build streak count (number of logs) for the confirmation ───
    from sqlalchemy import func
    from app.models.models import SymptomLog as SLog
    count_result = await db.execute(
        select(func.count()).select_from(SLog).where(SLog.patient_id == patient.id)
    )
    total_logs = count_result.scalar() or 0

    # ── Reply to patient ───────────────────────────────────────────
    confirmation = whatsapp_service.build_log_confirmation(
        patient_name=patient.name,
        parsed=parsed,
        streak=total_logs,
        escalated=escalated,
    )
    await whatsapp_service.send_text(phone, confirmation)

    # Escalation WhatsApp alerts to doctors are disabled — email only.
