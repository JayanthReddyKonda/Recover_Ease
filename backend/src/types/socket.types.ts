// ─── Socket.io Event Types ───────────────────────────
// Defines typed payloads for all real-time events

import { Severity } from '@prisma/client';

// ─── Server → Client Events ─────────────────────────

export interface PatientAlertPayload {
    escalationId: string;
    patientId: string;
    patientName: string;
    severity: Severity;
    rulesTriggered: string[];
    aiVerdict: string | null;
    aiReason: string | null;
    isSOS: boolean;
    createdAt: string;
}

export interface ConnectionRequestPayload {
    requestId: string;
    doctorId: string;
    doctorName: string;
    doctorEmail: string;
    createdAt: string;
}

export interface RequestAcceptedPayload {
    requestId: string;
    patientId: string;
    patientName: string;
}

export interface RequestRejectedPayload {
    requestId: string;
    patientId: string;
    patientName: string;
}

export interface DisconnectedPayload {
    disconnectedBy: string;
    disconnectedByName: string;
}

// ─── Server Emit Map ────────────────────────────────

export interface ServerToClientEvents {
    patient_alert: (payload: PatientAlertPayload) => void;
    connection_request: (payload: ConnectionRequestPayload) => void;
    request_accepted: (payload: RequestAcceptedPayload) => void;
    request_rejected: (payload: RequestRejectedPayload) => void;
    disconnected: (payload: DisconnectedPayload) => void;
}

// ─── Client → Server Events ─────────────────────────

export interface ClientToServerEvents {
    join_doctor_room: (doctorId: string) => void;
    join_patient_room: (patientId: string) => void;
}

// ─── Socket Data ─────────────────────────────────────

export interface SocketData {
    userId: string;
    role: string;
}
