// ─── Escalation Rule Thresholds ──────────────────────
// These thresholds define when the rule-based escalation layer triggers.
// Both rule layer AND AI layer must agree for a CRITICAL escalation.

export const ESCALATION_RULES = {
    /** Pain score at or above this triggers IMMEDIATE_SPIKE */
    PAIN_IMMEDIATE_SPIKE: 9,

    /** Pain above this for consecutive days triggers PAIN_SUSTAINED */
    PAIN_SUSTAINED_THRESHOLD: 8,
    /** Number of consecutive days for PAIN_SUSTAINED */
    PAIN_SUSTAINED_DAYS: 3,

    /** Sleep hours below this triggers SLEEP_DEPRIVATION */
    SLEEP_THRESHOLD_HOURS: 4,
    /** Number of consecutive days for SLEEP_DEPRIVATION */
    SLEEP_CONSECUTIVE_DAYS: 5,

    /** Both fatigue AND swelling above this on the same day = MULTI_SYMPTOM */
    MULTI_SYMPTOM_THRESHOLD: 8,

    /** All medications missed for this many consecutive days */
    MEDICATION_MISSED_DAYS: 3,

    /** Any metric increasing this many points in 2 days = RAPID_DETERIORATION */
    RAPID_CHANGE_POINTS: 4,

    /** No improvement in 7+ days past day 10 post-discharge = RECOVERY_PLATEAU */
    PLATEAU_NO_IMPROVEMENT_DAYS: 7,
    /** Plateau rule only activates after this many days post-discharge */
    PLATEAU_MIN_DAYS_POST_DISCHARGE: 10,
} as const;

// ─── Auth Constants ──────────────────────────────────

export const AUTH = {
    /** bcrypt hash rounds — 12 is the industry minimum for production */
    BCRYPT_ROUNDS: 12,
    /** JWT expiration — long-lived for hackathon (no refresh token) */
    TOKEN_EXPIRY: '7d',
} as const;

// ─── Rate Limiting ───────────────────────────────────

export const RATE_LIMITS = {
    /** General API: 100 requests per 15 minutes */
    GENERAL_WINDOW_MS: 15 * 60 * 1000,
    GENERAL_MAX_REQUESTS: 100,

    /** AI endpoints: 20 requests per 15 minutes (Groq free tier budget) */
    AI_WINDOW_MS: 15 * 60 * 1000,
    AI_MAX_REQUESTS: 20,

    /** Auth endpoints: 10 attempts per 15 minutes */
    AUTH_WINDOW_MS: 15 * 60 * 1000,
    AUTH_MAX_REQUESTS: 10,
} as const;

// ─── Redis Cache TTLs (seconds) ──────────────────────

export const CACHE_TTL = {
    /** Patient insight: cache for 1 hour */
    PATIENT_INSIGHT: 60 * 60,
    /** Doctor summary: cache for 30 minutes */
    DOCTOR_SUMMARY: 30 * 60,
    /** Symptom summary: cache for 5 minutes */
    SYMPTOM_SUMMARY: 5 * 60,
} as const;

// ─── Groq AI ─────────────────────────────────────────

export const GROQ = {
    MODEL: 'llama-3.1-70b-versatile',
    /** Max tokens for symptom parsing — short structured output */
    PARSE_MAX_TOKENS: 512,
    /** Max tokens for patient insight — medium narrative */
    INSIGHT_MAX_TOKENS: 1024,
    /** Max tokens for doctor summary — longer narrative */
    SUMMARY_MAX_TOKENS: 1500,
    /** Max tokens for escalation verdict */
    ESCALATION_MAX_TOKENS: 256,
    /** Temperature for structured output (low = deterministic) */
    STRUCTURED_TEMPERATURE: 0.1,
    /** Temperature for narrative output (slightly creative) */
    NARRATIVE_TEMPERATURE: 0.3,
} as const;

// ─── Recovery Stages ─────────────────────────────────
// Defines post-discharge recovery phases for patient guidance

export const RECOVERY_STAGES = [
    { minDay: 0, maxDay: 3, name: 'Immediate Recovery', key: 'immediate' },
    { minDay: 4, maxDay: 14, name: 'Early Recovery', key: 'early' },
    { minDay: 15, maxDay: 42, name: 'Progressive Recovery', key: 'progressive' },
    { minDay: 43, maxDay: 90, name: 'Advanced Recovery', key: 'advanced' },
    { minDay: 91, maxDay: Infinity, name: 'Full Recovery', key: 'full' },
] as const;

// ─── Milestone Definitions ───────────────────────────

export const MILESTONES = {
    FIRST_LOG: { key: 'first_log', title: 'First Check-in', icon: '🎯' },
    STREAK_3: { key: 'streak_3', title: '3-Day Streak', icon: '🔥' },
    STREAK_7: { key: 'streak_7', title: 'Week Warrior', icon: '⭐' },
    STREAK_14: { key: 'streak_14', title: 'Two Week Champion', icon: '🏆' },
    STREAK_30: { key: 'streak_30', title: 'Monthly Champion', icon: '👑' },
    PAIN_DECREASE: { key: 'pain_decrease', title: 'Pain Improvement', icon: '📉' },
    FULL_MEDS: { key: 'full_meds', title: 'Medication Master', icon: '💊' },
} as const;
