"""
Email service — using Resend for caregiver & SOS alerts.
"""

from __future__ import annotations

import asyncio

import resend

from app.core.config import settings
from app.core.logger import logger

resend.api_key = settings.resend_api_key


async def send_caregiver_alert(
    caregiver_email: str,
    patient_name: str,
    severity: str,
    details: str,
) -> bool:
    """Send an alert email to the patient's caregiver."""
    try:
        await asyncio.to_thread(
            resend.Emails.send,
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
    """Send an SOS alert email to the assigned doctor."""
    try:
        await asyncio.to_thread(
            resend.Emails.send,
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
