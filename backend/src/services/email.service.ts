import { Resend } from 'resend';
import { env } from '../config/env';
import { logger } from '../config/logger';

const resend = new Resend(env.RESEND_API_KEY);

// Resend free tier uses this sender by default
const FROM_EMAIL = 'Recovery Companion <onboarding@resend.dev>';

/**
 * Sends a caregiver alert email when an escalation is created.
 * Non-critical — failures are logged but do not propagate.
 */
export async function sendCaregiverAlert(
    to: string,
    patientName: string,
    severity: string,
    reason: string,
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `⚠️ Recovery Alert: ${patientName} — ${severity}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${severity === 'CRITICAL' ? '#dc2626' : '#f59e0b'};">
            Recovery Companion Alert
          </h2>
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Severity:</strong> ${severity}</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated alert from Recovery Companion. 
            Please check the dashboard for full details.
          </p>
        </div>
      `,
        });

        logger.info('Caregiver alert email sent', { to, patientName, severity });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Caregiver email failed (non-critical)', { to, error: message });
    }
}

/**
 * Sends an SOS alert email to the caregiver.
 */
export async function sendSOSAlert(
    to: string,
    patientName: string,
): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject: `🚨 SOS ALERT: ${patientName} needs immediate help`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 SOS ALERT</h2>
          <p><strong>${patientName}</strong> has triggered an SOS alert in Recovery Companion.</p>
          <p>This indicates they need immediate assistance. Please contact them or their doctor right away.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 14px;">
            This is an urgent automated alert from Recovery Companion.
          </p>
        </div>
      `,
        });

        logger.info('SOS alert email sent', { to, patientName });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('SOS email failed (non-critical)', { to, error: message });
    }
}
