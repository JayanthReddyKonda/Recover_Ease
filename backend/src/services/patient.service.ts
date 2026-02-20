import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { AppError } from '../middleware/error-handler';
import { runEscalationCheck } from './escalation.service';
import { getRecoveryStage } from './recovery.service';

/**
 * Returns patient profile visible to their connected doctor.
 */
export async function getPatientProfile(
    patientId: string,
    doctorId: string,
    deps: { db: PrismaClient },
): Promise<unknown> {
    await verifyDoctorPatientAccess(doctorId, patientId, deps);

    const patient = await deps.db.user.findUnique({
        where: { id: patientId },
        select: {
            id: true,
            name: true,
            email: true,
            condition: true,
            dischargeDate: true,
            caregiverEmail: true,
            medications: true,
            createdAt: true,
        },
    });

    if (!patient) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const daysSinceDischarge = patient.dischargeDate
        ? Math.floor((Date.now() - new Date(patient.dischargeDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const recoveryStage = daysSinceDischarge !== null
        ? getRecoveryStage(daysSinceDischarge)
        : null;

    return { ...patient, daysSinceDischarge, recoveryStage };
}

/**
 * Returns full patient detail including logs, escalations, and milestones.
 * Used by the doctor patient detail page.
 */
export async function getPatientFull(
    patientId: string,
    doctorId: string,
    deps: { db: PrismaClient },
): Promise<unknown> {
    await verifyDoctorPatientAccess(doctorId, patientId, deps);

    const [patient, logs, escalations, milestones] = await Promise.all([
        deps.db.user.findUnique({
            where: { id: patientId },
            select: {
                id: true,
                name: true,
                email: true,
                condition: true,
                dischargeDate: true,
                caregiverEmail: true,
                medications: true,
            },
        }),
        deps.db.symptomLog.findMany({
            where: { patientId },
            orderBy: { logDate: 'desc' },
            take: 30,
        }),
        deps.db.escalation.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                reviewedBy: { select: { name: true } },
            },
        }),
        deps.db.milestone.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    if (!patient) {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    const daysSinceDischarge = patient.dischargeDate
        ? Math.floor((Date.now() - new Date(patient.dischargeDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const recoveryStage = daysSinceDischarge !== null
        ? getRecoveryStage(daysSinceDischarge)
        : null;

    return {
        patient: { ...patient, daysSinceDischarge, recoveryStage },
        logs,
        escalations,
        milestones,
    };
}

/**
 * Patient triggers SOS — bypasses all checks, immediately CRITICAL.
 */
export async function triggerSOS(
    patientId: string,
    deps: { db: PrismaClient; io: Server },
): Promise<void> {
    await runEscalationCheck(patientId, true, deps);
}

/**
 * Doctor reviews (acknowledges) an escalation.
 */
export async function reviewEscalation(
    escalationId: string,
    doctorId: string,
    deps: { db: PrismaClient },
): Promise<void> {
    const escalation = await deps.db.escalation.findUnique({
        where: { id: escalationId },
    });

    if (!escalation) {
        throw new AppError('Escalation not found', 404, 'ESCALATION_NOT_FOUND');
    }

    // Verify doctor has access to this patient
    await verifyDoctorPatientAccess(doctorId, escalation.patientId, deps);

    await deps.db.escalation.update({
        where: { id: escalationId },
        data: {
            status: 'REVIEWED',
            reviewedById: doctorId,
            reviewedAt: new Date(),
        },
    });
}

// ─── Access Control ──────────────────────────────────

/**
 * Verifies that a doctor has an ACCEPTED connection with a patient.
 * Throws 403 if not authorized.
 */
async function verifyDoctorPatientAccess(
    doctorId: string,
    patientId: string,
    deps: { db: PrismaClient },
): Promise<void> {
    const connection = await deps.db.doctorPatientRequest.findFirst({
        where: {
            doctorId,
            patientId,
            status: 'ACCEPTED',
        },
    });

    if (!connection) {
        throw new AppError('Not authorized to view this patient', 403, 'ACCESS_DENIED');
    }
}
