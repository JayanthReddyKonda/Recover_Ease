"""
Email service — Gmail SMTP via aiosmtplib.
Works for ANY recipient domain. Free, no API key needed.
Requires: SMTP_USER (your Gmail) + SMTP_PASSWORD (Gmail App Password).

Setup (one-time):
  1. Enable 2-Step Verification on your Google account.
  2. Go to https://myaccount.google.com/apppasswords
  3. Create an App Password for "Mail" → copy the 16-char code.
  4. Set SMTP_USER=you@gmail.com  SMTP_PASSWORD=<16-char code> in .env
"""

from __future__ import annotations

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from html import escape as html_escape

import aiosmtplib

from app.core.config import settings
from app.core.logger import logger

if settings.smtp_enabled:
    logger.info("smtp_ready", user=settings.smtp_user, host=settings.smtp_host)
else:
    logger.warning(
        "smtp_disabled",
        msg="SMTP_USER / SMTP_PASSWORD not set — emails will be logged only. "
            "Add Gmail credentials to .env to enable real sending.",
    )


def _build_message(to: str, subject: str, html_body: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_user}>"
    msg["To"] = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))
    return msg


async def _send(to: str, subject: str, html_body: str) -> bool:
    """Core SMTP send — never raises, returns True on success."""
    if not settings.smtp_enabled:
        logger.info("email_logged_only", to=to, subject=subject)
        return False
    try:
        msg = _build_message(to, subject, html_body)
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_password,
            start_tls=True,
        )
        logger.info("email_sent", to=to, subject=subject)
        return True
    except Exception as e:
        logger.error("email_failed", to=to, subject=subject, error=str(e))
        return False


async def send_caregiver_alert(
    caregiver_email: str,
    patient_name: str,
    severity: str,
    details: str,
) -> bool:
    """Send an escalation alert to a caregiver or doctor."""
    safe_name = html_escape(patient_name)
    safe_sev = html_escape(severity)
    safe_det = html_escape(details)
    color = {"CRITICAL": "#dc2626", "HIGH": "#ea580c", "MEDIUM": "#d97706", "LOW": "#16a34a"}.get(severity.upper(), "#6b7280")
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:{color};margin:0 0 12px">Recovery Companion Alert</h2>
      <p><strong>Patient:</strong> {safe_name}</p>
      <p><strong>Severity:</strong> <span style="color:{color}">{safe_sev}</span></p>
      <p><strong>Details:</strong> {safe_det}</p>
      <p style="color:#6b7280;font-size:13px">Please check on your patient or contact them directly.</p>
    </div>"""
    return await _send(
        caregiver_email,
        f"Recovery Alert — {patient_name} ({severity})",
        html,
    )


async def send_sos_alert(
    doctor_email: str,
    patient_name: str,
    notes: str | None = None,
) -> bool:
    """Send an SOS alert to the actively treating doctor."""
    safe_name = html_escape(patient_name)
    safe_notes = html_escape(notes or "No additional notes provided")
    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:2px solid #dc2626;border-radius:12px">
      <h2 style="color:#dc2626;margin:0 0 12px">🚨 SOS Alert</h2>
      <p><strong>Patient:</strong> {safe_name}</p>
      <p><strong>Notes:</strong> {safe_notes}</p>
      <p style="color:#dc2626;font-weight:bold">This patient needs immediate attention. Please respond now.</p>
    </div>"""
    return await _send(
        doctor_email,
        f"🚨 SOS — {patient_name} needs immediate attention",
        html,
    )
