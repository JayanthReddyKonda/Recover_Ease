"""
WhatsApp Business service — send messages via Meta Cloud API (v19.0).

Setup guide:
  1. Create a Meta App at https://developers.facebook.com/apps
  2. Add the WhatsApp product and choose a test/permanent phone number
  3. Copy the access token  → WHATSAPP_TOKEN in .env
  4. Copy the Phone Number ID → WHATSAPP_PHONE_NUMBER_ID in .env
  5. In the Webhooks section set the URL to:
       https://<your-domain>/api/webhook/whatsapp
     and the Verify Token to the value of WHATSAPP_VERIFY_TOKEN in .env
  6. Subscribe to the "messages" webhook field under WhatsApp > Configuration

Free tier: 1,000 user-initiated conversations / month at no cost.
"""

from __future__ import annotations

import httpx

from app.core.config import settings
from app.core.logger import logger

_GRAPH_URL = "https://graph.facebook.com/v19.0"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.whatsapp_token}",
        "Content-Type": "application/json",
    }


async def send_text(phone: str, message: str) -> bool:
    """
    Send a plain-text WhatsApp message to the given E.164 phone number.
    Returns True on success, False when disabled or on error.

    NOTE: In Meta test/sandbox accounts, free-form text can only be sent within
    a 24-hour window AFTER the recipient has messaged the business number first.
    For business-initiated doctor alerts use send_template() instead.
    """
    if not settings.whatsapp_enabled:
        logger.info("whatsapp_disabled_skip_send", phone_prefix=phone[:6])
        return False

    url = f"{_GRAPH_URL}/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message, "preview_url": False},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=_headers())
            body = resp.text
            if resp.status_code == 200:
                logger.info("whatsapp_sent", phone_prefix=phone[:6], status=200)
                return True
            else:
                logger.error("whatsapp_http_error", phone_prefix=phone[:6],
                             status=resp.status_code, body=body[:300])
                return False
    except Exception as e:
        logger.error("whatsapp_send_failed", phone_prefix=phone[:6], error=str(e))
        return False


async def send_template(phone: str, template_name: str, lang: str = "en_US",
                        components: list | None = None) -> bool:
    """
    Send a pre-approved WhatsApp template message (works without a 24h session window).
    Use this for business-initiated alerts (doctor SOS/escalation notifications).

    Meta provides 'hello_world' on every test account. For production, create a
    custom template in Meta Business Suite → WhatsApp Manager → Message Templates.
    """
    if not settings.whatsapp_enabled:
        return False

    url = f"{_GRAPH_URL}/{settings.whatsapp_phone_number_id}/messages"
    template_payload: dict = {
        "name": template_name,
        "language": {"code": lang},
    }
    if components:
        template_payload["components"] = components

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": template_payload,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=_headers())
            body = resp.text
            if resp.status_code == 200:
                logger.info("whatsapp_template_sent", phone_prefix=phone[:6],
                            template=template_name)
                return True
            else:
                logger.error("whatsapp_template_error", phone_prefix=phone[:6],
                             status=resp.status_code, body=body[:300])
                return False
    except Exception as e:
        logger.error("whatsapp_template_failed", phone_prefix=phone[:6], error=str(e))
        return False


async def send_doctor_alert(phone: str, message: str) -> bool:
    """
    Send an alert to a doctor — tries free text first (works when doctor has active
    session), falls back to hello_world template so the doctor at least gets pinged.
    """
    sent = await send_text(phone, message)
    if not sent:
        # Fallback: hello_world template — guaranteed delivery, no session needed
        logger.info("whatsapp_falling_back_to_template", phone_prefix=phone[:6])
        sent = await send_template(phone, "hello_world")
    return sent


def build_log_confirmation(
    patient_name: str,
    parsed: dict,
    streak: int = 0,
    escalated: bool = False,
) -> str:
    """Build a friendly confirmation message to send back to the patient."""
    fields = parsed.get("parsed_fields", [])
    pain = parsed["pain_level"]
    sleep = parsed["sleep_hours"]
    mood = parsed["mood"]

    parts: list[str] = [f"✅ *Logged, {patient_name.split()[0]}!*"]

    # Show explicitly captured values
    if "pain_level" in fields:
        pain_emoji = "🔴" if pain >= 8 else "🟡" if pain >= 5 else "🟢"
        parts.append(f"{pain_emoji} Pain: {pain}/10")
    if "sleep_hours" in fields:
        sleep_emoji = "😴" if sleep >= 7 else "⚠️"
        parts.append(f"{sleep_emoji} Sleep: {sleep:.1f} hrs")
    if "mood" in fields:
        mood_emoji = "😊" if mood >= 7 else "😐" if mood >= 4 else "😟"
        parts.append(f"{mood_emoji} Mood: {mood}/10")

    if not fields:
        parts.append("📋 Entry saved with default values.")

    if streak > 0:
        parts.append(f"🔥 Streak: {streak} day{'s' if streak != 1 else ''}")

    if escalated:
        parts.append("⚠️ Your doctor has been notified due to your current readings.")
    else:
        parts.append("Keep going! 💪")

    return "\n".join(parts)


def build_doctor_alert(patient_name: str, parsed: dict, escalation_reason: str) -> str:
    """Build an alert message to send to the doctor."""
    pain = parsed["pain_level"]
    sleep = parsed["sleep_hours"]
    mood = parsed["mood"]
    return (
        f"⚠️ *Recovery Companion Alert*\n"
        f"Patient: *{patient_name}*\n"
        f"Pain: {pain}/10 · Sleep: {sleep:.1f}h · Mood: {mood}/10\n"
        f"Reason: {escalation_reason}\n"
        f"👉 View full dashboard for details."
    )
