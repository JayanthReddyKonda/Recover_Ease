import { Role, RequestStatus, Severity, EscalationStatus } from '@prisma/client';

// ─── Re-export Prisma enums for convenience ──────────
export { Role, RequestStatus, Severity, EscalationStatus };

// ─── Auth ────────────────────────────────────────────

export interface JwtPayload {
    id: string;
    email: string;
    role: Role;
}

export interface SafeUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    condition: string | null;
    dischargeDate: Date | null;
    caregiverEmail: string | null;
    medications: string[];
    createdAt: Date;
}

export interface AuthResponse {
    token: string;
    user: SafeUser;
}

// ─── DTOs ────────────────────────────────────────────

export interface RegisterDTO {
    name: string;
    email: string;
    password: string;
    role: Role;
    condition?: string;
    dischargeDate?: string;
    caregiverEmail?: string;
    medications?: string[];
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface LogSymptomDTO {
    pain?: number;
    fatigue?: number;
    swelling?: number;
    sleepHours?: number;
    mood?: number;
    appetite?: number;
    rawInput?: string;
    voiceInput?: boolean;
    medicationTaken?: Record<string, boolean>;
    logDate?: string;
}

export interface ProfileUpdateDTO {
    name?: string;
    condition?: string;
    dischargeDate?: string;
    caregiverEmail?: string;
    medications?: string[];
}

// ─── Escalation ──────────────────────────────────────

export interface RuleResult {
    triggered: boolean;
    rules: string[];
}

export interface AIVerdict {
    verdict: 'ALERT' | 'MONITOR' | 'NORMAL';
    reason: string;
    confidence: number;
}

export interface EscalationResult {
    severity: Severity;
    rulesTriggered: string[];
    aiVerdict: AIVerdict | null;
    isSOS: boolean;
}

// ─── API Response ────────────────────────────────────

export interface ApiSuccessResponse<T> {
    data: T;
    message?: string;
}

export interface ApiErrorResponse {
    error: string;
    code: string;
    details?: unknown;
}

// ─── Patient Stats (for doctor dashboard) ────────────

export interface PatientWithStats {
    id: string;
    name: string;
    email: string;
    condition: string | null;
    dischargeDate: Date | null;
    medications: string[];
    latestLog: {
        logDate: Date;
        pain: number | null;
        fatigue: number | null;
        swelling: number | null;
        sleepHours: number | null;
        mood: number | null;
        appetite: number | null;
    } | null;
    activeEscalations: number;
    highestSeverity: Severity;
    daysSinceDischarge: number | null;
}

// ─── AI Parsing ──────────────────────────────────────

export interface ParsedSymptoms {
    pain?: number;
    fatigue?: number;
    swelling?: number;
    sleepHours?: number;
    mood?: number;
    appetite?: number;
    medicationTaken?: Record<string, boolean>;
}

export interface PatientInsight {
    summary: string;
    concerns: string[];
    positives: string[];
    recommendation: string;
}

export interface DoctorSummary {
    overview: string;
    criticalPatients: string[];
    actionItems: string[];
}
