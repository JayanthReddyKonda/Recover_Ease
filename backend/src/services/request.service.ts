import { PrismaClient, RequestStatus } from '@prisma/client';
import { Server } from 'socket.io';
import { AppError } from '../middleware/error-handler';
import { logger } from '../config/logger';
import { Severity, PatientWithStats } from '../types';
import {
    ConnectionRequestPayload,
    RequestAcceptedPayload,
    RequestRejectedPayload,
    DisconnectedPayload,
} from '../types/socket.types';

/**
 * Doctor sends a connection request to a patient by their ID.
 */
export async function sendRequest(
    doctorId: string,
    patientId: string,
    deps: { db: PrismaClient; io: Server },
): Promise<{ requestId: string }> {
    // Verify patient exists and is actually a PATIENT
    const patient = await deps.db.user.findUnique({
        where: { id: patientId },
        select: { id: true, role: true },
    });

    if (!patient || patient.role !== 'PATIENT') {
        throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Check for existing request
    const existing = await deps.db.doctorPatientRequest.findUnique({
        where: { doctorId_patientId: { doctorId, patientId } },
    });

    if (existing) {
        throw new AppError('Request already sent', 409, 'DUPLICATE_REQUEST');
    }

    const request = await deps.db.doctorPatientRequest.create({
        data: { doctorId, patientId },
        include: {
            doctor: { select: { name: true, email: true } },
        },
    });

    // Emit real-time notification to patient
    const payload: ConnectionRequestPayload = {
        requestId: request.id,
        doctorId,
        doctorName: request.doctor.name,
        doctorEmail: request.doctor.email,
        createdAt: request.createdAt.toISOString(),
    };
    deps.io.to(`patient:${patientId}`).emit('connection_request', payload);

    return { requestId: request.id };
}

/**
 * Returns pending requests for the authenticated user.
 * Patient sees received requests. Doctor sees sent requests.
 */
export async function getPendingRequests(
    userId: string,
    role: string,
    deps: { db: PrismaClient },
): Promise<unknown[]> {
    if (role === 'PATIENT') {
        return deps.db.doctorPatientRequest.findMany({
            where: { patientId: userId, status: 'PENDING' },
            include: {
                doctor: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    return deps.db.doctorPatientRequest.findMany({
        where: { doctorId: userId, status: 'PENDING' },
        include: {
            patient: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * Patient accepts a connection request.
 */
export async function acceptRequest(
    requestId: string,
    patientId: string,
    deps: { db: PrismaClient; io: Server },
): Promise<void> {
    const request = await deps.db.doctorPatientRequest.findUnique({
        where: { id: requestId },
        include: {
            patient: { select: { id: true, name: true } },
        },
    });

    if (!request || request.patientId !== patientId) {
        throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
        throw new AppError('Request already processed', 409, 'ALREADY_PROCESSED');
    }

    await deps.db.doctorPatientRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
    });

    // Notify doctor in real-time
    const payload: RequestAcceptedPayload = {
        requestId,
        patientId,
        patientName: request.patient.name,
    };
    deps.io.to(`doctor:${request.doctorId}`).emit('request_accepted', payload);
}

/**
 * Patient rejects a connection request.
 */
export async function rejectRequest(
    requestId: string,
    patientId: string,
    deps: { db: PrismaClient; io: Server },
): Promise<void> {
    const request = await deps.db.doctorPatientRequest.findUnique({
        where: { id: requestId },
        include: {
            patient: { select: { id: true, name: true } },
        },
    });

    if (!request || request.patientId !== patientId) {
        throw new AppError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
        throw new AppError('Request already processed', 409, 'ALREADY_PROCESSED');
    }

    await deps.db.doctorPatientRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
    });

    const payload: RequestRejectedPayload = {
        requestId,
        patientId,
        patientName: request.patient.name,
    };
    deps.io.to(`doctor:${request.doctorId}`).emit('request_rejected', payload);
}

/**
 * Returns the patient's accepted doctor (if any).
 */
export async function getMyDoctor(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<{ id: string; name: string; email: string } | null> {
    const request = await deps.db.doctorPatientRequest.findFirst({
        where: { patientId, status: 'ACCEPTED' },
        include: {
            doctor: { select: { id: true, name: true, email: true } },
        },
    });

    return request ? request.doctor : null;
}

/**
 * Returns all accepted patients for a doctor, with stats for dashboard triage.
 */
export async function getMyPatients(
    doctorId: string,
    deps: { db: PrismaClient },
): Promise<PatientWithStats[]> {
    const requests = await deps.db.doctorPatientRequest.findMany({
        where: { doctorId, status: 'ACCEPTED' },
        include: {
            patient: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    condition: true,
                    dischargeDate: true,
                    medications: true,
                },
            },
        },
    });

    const results: PatientWithStats[] = [];

    for (const req of requests) {
        const patient = req.patient;

        // Get latest symptom log
        const latestLog = await deps.db.symptomLog.findFirst({
            where: { patientId: patient.id },
            orderBy: { logDate: 'desc' },
            select: {
                logDate: true,
                pain: true,
                fatigue: true,
                swelling: true,
                sleepHours: true,
                mood: true,
                appetite: true,
            },
        });

        // Get active escalation count and highest severity
        const activeEscalations = await deps.db.escalation.findMany({
            where: { patientId: patient.id, status: 'ACTIVE' },
            select: { severity: true },
        });

        const highestSeverity = activeEscalations.reduce<Severity>((highest, esc) => {
            if (esc.severity === 'CRITICAL') return 'CRITICAL';
            if (esc.severity === 'MONITOR' && highest !== 'CRITICAL') return 'MONITOR';
            return highest;
        }, 'NORMAL');

        const daysSinceDischarge = patient.dischargeDate
            ? Math.floor((Date.now() - new Date(patient.dischargeDate).getTime()) / (1000 * 60 * 60 * 24))
            : null;

        results.push({
            ...patient,
            latestLog,
            activeEscalations: activeEscalations.length,
            highestSeverity,
            daysSinceDischarge,
        });
    }

    // Sort by severity: CRITICAL first, then MONITOR, then NORMAL
    const severityOrder: Record<Severity, number> = { CRITICAL: 0, MONITOR: 1, NORMAL: 2 };
    results.sort((a, b) => severityOrder[a.highestSeverity] - severityOrder[b.highestSeverity]);

    return results;
}

/**
 * Either party disconnects from the doctor-patient relationship.
 */
export async function disconnect(
    userId: string,
    role: string,
    deps: { db: PrismaClient; io: Server },
): Promise<void> {
    const user = await deps.db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true },
    });

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const whereClause = role === 'DOCTOR'
        ? { doctorId: userId, status: 'ACCEPTED' as RequestStatus }
        : { patientId: userId, status: 'ACCEPTED' as RequestStatus };

    const request = await deps.db.doctorPatientRequest.findFirst({
        where: whereClause,
    });

    if (!request) {
        throw new AppError('No active connection found', 404, 'NO_CONNECTION');
    }

    await deps.db.doctorPatientRequest.delete({
        where: { id: request.id },
    });

    // Notify the other party
    const targetRoom = role === 'DOCTOR'
        ? `patient:${request.patientId}`
        : `doctor:${request.doctorId}`;

    const payload: DisconnectedPayload = {
        disconnectedBy: userId,
        disconnectedByName: user.name,
    };
    deps.io.to(targetRoom).emit('disconnected', payload);

    logger.info('Connection disconnected', { by: userId, role });
}
