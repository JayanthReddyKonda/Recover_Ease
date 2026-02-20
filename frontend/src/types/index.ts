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
    whatsapp_phone: string | null;
    created_at: string;
    updated_at: string;
}

// Doctor-patient link (junction table row)
export interface DoctorLink {
    link_id: string;
    doctor_id: string;
    patient_id: string;
    specialty: string | null;
    is_active: boolean;
    created_at: string;
    doctor: SafeUser | null;
    patient: SafeUser | null;
}

// Patient as seen by a doctor (includes treatment status)
export interface PatientWithStatus extends SafeUser {
    is_active: boolean;
    link_id: string;
}

// ─── Auth ──────────────────────────────────────────────

export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
    role: Role;
    whatsapp_phone?: string | null;
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
    whatsapp_phone?: string | null;
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

export interface MedicationInput {
    name: string;
    dosage: string;
    frequency: string;
    time_of_day: string;
    instructions: string;
}

export interface MedicationScheduleItem {
    name: string;
    dosage: string;
    frequency: string;
    time_of_day: string;
    instructions: string;
}

export interface AiStructuredPlan {
    condition_summary: string;
    diagnosis_keywords: string[];
    medication_schedule: MedicationScheduleItem[];
    care_instructions: string[];
    dietary_notes: string;
    activity_restrictions: string;
    follow_up_timeline: string;
    risk_flags: string[];
    urgency: string;
}

export interface SendRequestBody {
    to_email?: string;
    connect_code?: string;
    specialty?: string;
    visit_date?: string;
    disease_description: string;
    medications: MedicationInput[];
}

export interface RequestResponse {
    id: string;
    from_id: string;
    to_id: string;
    status: RequestStatus;
    created_at: string;
    from_user: SafeUser | null;
    to_user: SafeUser | null;
    specialty: string | null;
    visit_date: string | null;
    disease_description: string | null;
    medications: MedicationInput[] | null;
    ai_structured_plan: AiStructuredPlan | null;
}

// ─── Patient ───────────────────────────────────────────

// ─── Care Plan & Recovery Tasks ────────────────────────

export type RecoveryTaskStatus = "PENDING" | "COMPLETED" | "SKIPPED";

export interface RecoveryTask {
    id: string;
    doctor_id: string;
    patient_id: string;
    title: string;
    description: string | null;
    frequency: string | null;
    due_date: string | null;
    is_active: boolean;
    status: RecoveryTaskStatus;
    completed_at: string | null;
    completion_note: string | null;
    created_at: string;
    updated_at: string;
    doctor_name: string | null;
}

export interface CarePlan {
    patient_id: string;
    doctor_id: string;
    specialty: string | null;
    is_active: boolean;
    medications: MedicationInput[] | null;
    expected_recovery_date: string | null;
    recovery_duration: string | null;
    care_notes: string | null;
    created_at: string;
}

export interface UpdateCarePlanBody {
    medications?: MedicationInput[];
    expected_recovery_date?: string;
    recovery_duration?: string;
    care_notes?: string;
}

export interface CreateTaskBody {
    title: string;
    description?: string;
    frequency?: string;
    due_date?: string;
}

export interface UpdateTaskBody {
    title?: string;
    description?: string;
    frequency?: string;
    due_date?: string;
    is_active?: boolean;
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

// ─── Chat ───────────────────────────────────────────────

export type ChatSessionStatus = "REQUESTED" | "ACTIVE" | "CLOSED";

export interface ChatMessage {
    id: string;
    session_id: string;
    sender_id: string | null;
    sender_name: string | null;
    content: string;
    is_ai: boolean;
    is_voice: boolean;
    audio_url?: string | null;
    image_url?: string | null;
    created_at: string;
}

export interface ChatSession {
    id: string;
    patient_id: string;
    doctor_id: string | null;
    status: ChatSessionStatus;
    title: string;
    is_request: boolean;
    created_at: string;
    updated_at: string;
    last_message: string | null;
    unread: number;
}

// Socket event: new real-time message arrived
export interface NewMessageEvent {
    session_id: string;
    message: ChatMessage;
}

// Socket event: someone is typing
export interface TypingEvent {
    session_id: string;
    user_name: string;
}

// Socket event: doctor accepted a chat request
export interface ChatRequestAcceptedEvent {
    session_id: string;
    doctor_name: string;
}

// Socket event: patient sent a chat request
export interface ChatRequestEvent {
    session_id: string;
    patient_name: string;
    title: string;
}

// ─── Toast ─────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info" | "alert";

export interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message: string;
}
