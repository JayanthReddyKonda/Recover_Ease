// ─── Enums ─────────────────────────────────────────────

export type Role = "PATIENT" | "DOCTOR";
export type RequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type EscalationStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

// ─── Generic API wrapper ───────────────────────────────

export interface ApiResponse<T> {
    success: boolean;
    data: T | null;
    message: string | null;
}

export interface ApiError {
    success: false;
    error: string;
    code: number | null;
}

// ─── User ──────────────────────────────────────────────

export interface SafeUser {
    id: string;
    email: string;
    name: string;
    role: Role;
    connect_code: string;
    surgery_date: string | null;
    surgery_type: string | null;
    caregiver_email: string | null;
    created_at: string;
    updated_at: string;
}

// Doctor-patient link (junction table row)
export interface DoctorLink {
    link_id: string;
    doctor_id: string;
    patient_id: string;
    specialty: string | null;
    created_at: string;
    doctor: SafeUser | null;
    patient: SafeUser | null;
}

// ─── Auth ──────────────────────────────────────────────

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    role: Role;
    surgery_date?: string | null;
    surgery_type?: string | null;
    caregiver_email?: string | null;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: SafeUser;
    token: string;
}

export interface ProfileUpdateRequest {
    name?: string | null;
    surgery_date?: string | null;
    surgery_type?: string | null;
    caregiver_email?: string | null;
}

// ─── Symptoms ──────────────────────────────────────────

export interface LogSymptomRequest {
    pain_level: number;
    fatigue_level: number;
    mood: number;
    sleep_hours: number;
    appetite: number;
    energy: number;
    temperature?: number | null;
    notes?: string | null;
}

export interface SymptomLogResponse {
    id: string;
    patient_id: string;
    date: string;
    pain_level: number;
    fatigue_level: number;
    mood: number;
    sleep_hours: number;
    appetite: number;
    energy: number;
    temperature: number | null;
    notes: string | null;
    parsed_symptoms: ParsedSymptoms | null;
    ai_insight: PatientInsight | null;
    created_at: string;
}

export interface SymptomTrendPoint {
    date: string;
    pain_level: number;
    fatigue_level: number;
    mood: number;
    sleep_hours: number;
    appetite: number;
    energy: number;
}

export interface SymptomSummary {
    total_logs: number;
    avg_pain: number;
    avg_mood: number;
    avg_energy: number;
    avg_sleep: number;
}

// ─── Requests ──────────────────────────────────────────

export interface SendRequestBody {
    to_email?: string;
    connect_code?: string;
    specialty?: string;
}

export interface RequestResponse {
    id: string;
    from_id: string;
    to_id: string;
    status: RequestStatus;
    created_at: string;
    from_user: SafeUser | null;
    to_user: SafeUser | null;
}

// ─── Patient ───────────────────────────────────────────

export interface EscalationResponse {
    id: string;
    patient_id: string;
    symptom_log_id: string;
    doctor_id: string | null;
    severity: Severity;
    status: EscalationStatus;
    rule_results: Record<string, unknown>[] | Record<string, unknown> | null;
    ai_verdict: EscalationVerdict | null;
    is_sos: boolean;
    doctor_notes: string | null;
    created_at: string;
    resolved_at: string | null;
}

export interface MilestoneResponse {
    id: string;
    milestone_key: string;
    title: string;
    icon: string;
    earned_at: string;
}

export interface RecoveryStage {
    name: string;
    day: number;
    description: string;
}

export interface PatientProfile {
    user: SafeUser;
    log_count: number;
    latest_log: SymptomLogResponse | null;
    milestones: MilestoneResponse[];
    recovery_stage: RecoveryStage | null;
}

export interface PatientFull {
    user: SafeUser;
    logs: SymptomLogResponse[];
    escalations: EscalationResponse[];
    milestones: MilestoneResponse[];
    recovery_stage: RecoveryStage | null;
    ai_summary: DoctorSummary | null;
}

export interface ReviewEscalationRequest {
    status: "ACKNOWLEDGED" | "RESOLVED";
    notes?: string | null;
}

export interface SOSRequest {
    notes?: string | null;
}

// ─── AI ────────────────────────────────────────────────

export interface PatientInsight {
    summary: string;
    tips: string[];
    encouragement: string;
    warning_signs: string[];
}

export interface DoctorSummary {
    overview: string;
    trends: {
        improving: string[];
        declining: string[];
        stable: string[];
    };
    risk_factors: string[];
    recommendations: string[];
}

export interface ParsedSymptoms {
    symptoms: {
        name: string;
        severity: "mild" | "moderate" | "severe";
        duration: string | null;
    }[];
    concerns: string[];
    recommendations: string[];
}

export interface EscalationVerdict {
    should_escalate: boolean;
    severity: Severity;
    reasoning: string;
    immediate_actions: string[];
}

// ─── Socket Events ─────────────────────────────────────

export interface PatientAlertEvent {
    type: "escalation" | "sos";
    patient_id: string;
    patient_name: string;
    severity: Severity;
    is_sos: boolean;
}

export interface MilestoneEarnedEvent {
    milestones: { key: string; title: string; icon: string }[];
}

// ─── Toast ─────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "alert";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}
