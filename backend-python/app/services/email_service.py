"""
Email service — using Resend for caregiver & SOS alerts.
Degrades gracefully when Resend key is a placeholder — logs instead of sending.
"""

from __future__ import annotations

import asyncio

from app.core.config import settings
from app.core.logger import logger

# Only import & configure resend if we have a real key
_RESEND_READY = False
if settings.resend_enabled:
    try:
        import resend
        resend.api_key = settings.resend_api_key
        _RESEND_READY = True
    except ImportError:
        logger.warning("resend_package_missing", msg="pip install resend — emails disabled")


async def send_caregiver_alert(
    caregiver_email: str,
    patient_name: str,
    severity: str,
    details: str,
) -> bool:
    """Send an alert email to the patient's caregiver. Never raises."""
    if not _RESEND_READY:
        logger.info("email_skipped_no_key", to=caregiver_email, patient=patient_name, severity=severity)
        return False

    try:
        await asyncio.to_thread(
            resend.Emails.send,  # type: ignore[name-defined]
            {
                "from": settings.resend_from,
                "to": [caregiver_email],
                "subject": f"⚠️ Recovery Alert — {patient_name} ({severity})",
                "html": (
                    f"<h2>Recovery Companion Alert</h2>"
                    f"<p><strong>Patient:</strong> {patient_name}</p>"
                    f"<p><strong>Severity:</strong> {severity}</p>"
                    f"<p><strong>Details:</strong> {details}</p>"
                    f"<p>Please check on your loved one or contact their doctor.</p>"
                ),
            },
        )
        logger.info("caregiver_email_sent", to=caregiver_email, patient=patient_name)
        return True
    except Exception as e:
        logger.error("caregiver_email_failed", error=str(e))
        return False


async def send_sos_alert(
    doctor_email: str,
    patient_name: str,
    notes: str | None = None,
) -> bool:
    """Send an SOS alert email to the assigned doctor. Never raises."""
    if not _RESEND_READY:
        logger.info("email_skipped_no_key", to=doctor_email, patient=patient_name, type="sos")
        return False

    try:
        await asyncio.to_thread(
            resend.Emails.send,  # type: ignore[name-defined]
            {
                "from": settings.resend_from,
                "to": [doctor_email],
                "subject": f"🚨 SOS — {patient_name} needs immediate attention",
                "html": (
                    f"<h2>🚨 SOS Alert</h2>"
                    f"<p><strong>Patient:</strong> {patient_name}</p>"
                    f"<p><strong>Notes:</strong> {notes or 'No additional notes'}</p>"
                    f"<p>This patient has triggered an SOS alert. Please respond immediately.</p>"
                ),
            },
        )
        logger.info("sos_email_sent", to=doctor_email, patient=patient_name)
        return True
    except Exception as e:
        logger.error("sos_email_failed", error=str(e))
        return False
