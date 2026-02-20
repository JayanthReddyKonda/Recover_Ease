import { PrismaClient, SymptomLog, Severity } from '@prisma/client';
import { Server } from 'socket.io';
import { ESCALATION_RULES } from '../config/constants';
import { logger } from '../config/logger';
import { RuleResult, EscalationResult, AIVerdict } from '../types';
import { getEscalationVerdict } from './groq.service';
import { sendCaregiverAlert, sendSOSAlert } from './email.service';
import { PatientAlertPayload } from '../types/socket.types';

// ─── Rule Engine ─────────────────────────────────────

/**
 * Runs all 7 escalation rules against recent symptom logs.
 * Returns which rules triggered and whether any triggered at all.
 */
export function runRuleChecks(
    logs: SymptomLog[],
    daysSinceDischarge: number | null,
): RuleResult {
    const triggered: string[] = [];

    if (logs.length === 0) {
        return { triggered: false, rules: [] };
    }

    // Sort logs by date descending (most recent first)
    const sorted = [...logs].sort(
        (a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime(),
    );

    const latest = sorted[0];

    // Rule 1: IMMEDIATE_SPIKE — pain >= 9 on any single day
    if (latest.pain !== null && latest.pain >= ESCALATION_RULES.PAIN_IMMEDIATE_SPIKE) {
        triggered.push('IMMEDIATE_SPIKE');
    }

    // Rule 2: PAIN_SUSTAINED — pain > 8 for 3+ consecutive days
    if (checkConsecutive(sorted, 'pain', ESCALATION_RULES.PAIN_SUSTAINED_THRESHOLD, ESCALATION_RULES.PAIN_SUSTAINED_DAYS, 'above')) {
        triggered.push('PAIN_SUSTAINED');
    }

    // Rule 3: SLEEP_DEPRIVATION — sleep < 4 hours for 5+ consecutive days
    if (checkConsecutive(sorted, 'sleepHours', ESCALATION_RULES.SLEEP_THRESHOLD_HOURS, ESCALATION_RULES.SLEEP_CONSECUTIVE_DAYS, 'below')) {
        triggered.push('SLEEP_DEPRIVATION');
    }

    // Rule 4: MULTI_SYMPTOM — fatigue > 8 AND swelling > 8 on same day
    if (latest.fatigue !== null && latest.swelling !== null &&
        latest.fatigue > ESCALATION_RULES.MULTI_SYMPTOM_THRESHOLD &&
        latest.swelling > ESCALATION_RULES.MULTI_SYMPTOM_THRESHOLD) {
        triggered.push('MULTI_SYMPTOM');
    }

    // Rule 5: MEDICATION_NON_COMPLIANCE — all meds missed 3+ consecutive days
    if (checkMedicationCompliance(sorted, ESCALATION_RULES.MEDICATION_MISSED_DAYS)) {
        triggered.push('MEDICATION_NON_COMPLIANCE');
    }

    // Rule 6: RAPID_DETERIORATION — any metric increases 4+ points in 2 days
    if (sorted.length >= 2 && checkRapidDeterioration(sorted[0], sorted[1])) {
        triggered.push('RAPID_DETERIORATION');
    }

    // Rule 7: RECOVERY_PLATEAU — no improvement in 7 days past day 10
    if (daysSinceDischarge !== null &&
        daysSinceDischarge > ESCALATION_RULES.PLATEAU_MIN_DAYS_POST_DISCHARGE &&
        checkPlateau(sorted)) {
        triggered.push('RECOVERY_PLATEAU');
    }

    return { triggered: triggered.length > 0, rules: triggered };
}

/**
 * Full escalation check: run rules → if any trigger, get AI verdict → determine severity.
 * SOS bypasses all rules and AI — always CRITICAL.
 */
export async function runEscalationCheck(
    patientId: string,
    isSOS: boolean,
    deps: { db: PrismaClient; io: Server },
): Promise<EscalationResult> {
    const patient = await deps.db.user.findUnique({
        where: { id: patientId },
        select: { name: true, condition: true, dischargeDate: true, caregiverEmail: true },
    });

    if (!patient) {
        throw new Error(`Patient ${patientId} not found`);
    }

    // SOS bypasses everything — immediately CRITICAL
    if (isSOS) {
        const escalation = await deps.db.escalation.create({
            data: {
                patientId,
                rulesTriggered: ['SOS'],
                aiVerdict: null,
                aiReason: null,
                aiConfidence: null,
                severity: 'CRITICAL',
                isSOS: true,
            },
        });

        const alertPayload = buildAlertPayload(escalation.id, patientId, patient.name, 'CRITICAL', ['SOS'], null, null, true);
        deps.io.to('doctor_alerts').emit('patient_alert', alertPayload);

        // Fire-and-forget: email failure must not block SOS response
        if (patient.caregiverEmail) {
            sendSOSAlert(patient.caregiverEmail, patient.name).catch((err) =>
                logger.warn('SOS email fire-and-forget failed', { error: err instanceof Error ? err.message : 'Unknown' }),
            );
        }

        return {
            severity: 'CRITICAL',
            rulesTriggered: ['SOS'],
            aiVerdict: null,
            isSOS: true,
        };
    }

    // Fetch recent logs for rule checks (last 10 days)
    const logs = await deps.db.symptomLog.findMany({
        where: { patientId },
        orderBy: { logDate: 'desc' },
        take: 10,
    });

    const daysSinceDischarge = patient.dischargeDate
        ? Math.floor((Date.now() - new Date(patient.dischargeDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;

    // Step 1: Run rule-based checks
    const ruleResult = runRuleChecks(logs, daysSinceDischarge);

    if (!ruleResult.triggered) {
        return {
            severity: 'NORMAL',
            rulesTriggered: [],
            aiVerdict: null,
            isSOS: false,
        };
    }

    // Step 2: Rules triggered — get AI verdict
    const simplifiedLogs = logs.map((l) => ({
        logDate: l.logDate,
        pain: l.pain,
        fatigue: l.fatigue,
        swelling: l.swelling,
        sleepHours: l.sleepHours,
        mood: l.mood,
        appetite: l.appetite,
    }));

    const aiResult = await getEscalationVerdict(
        ruleResult.rules,
        simplifiedLogs,
        patient.condition,
    );

    // Step 3: Determine severity — BOTH must agree for CRITICAL
    const severity = determineSeverity(ruleResult.triggered, aiResult);

    // Step 4: Persist escalation
    const escalation = await deps.db.escalation.create({
        data: {
            patientId,
            rulesTriggered: ruleResult.rules,
            aiVerdict: aiResult?.verdict ?? null,
            aiReason: aiResult?.reason ?? null,
            aiConfidence: aiResult?.confidence ?? null,
            severity,
            isSOS: false,
        },
    });

    // Step 5: Emit real-time alert if not NORMAL
    if (severity !== 'NORMAL') {
        const alertPayload = buildAlertPayload(
            escalation.id, patientId, patient.name, severity,
            ruleResult.rules, aiResult?.verdict ?? null, aiResult?.reason ?? null, false,
        );
        deps.io.to('doctor_alerts').emit('patient_alert', alertPayload);

        // Fire-and-forget: caregiver email
        if (patient.caregiverEmail) {
            sendCaregiverAlert(
                patient.caregiverEmail,
                patient.name,
                severity,
                aiResult?.reason ?? ruleResult.rules.join(', '),
            ).catch((err) =>
                logger.warn('Caregiver email fire-and-forget failed', { error: err instanceof Error ? err.message : 'Unknown' }),
            );
        }
    }

    return {
        severity,
        rulesTriggered: ruleResult.rules,
        aiVerdict: aiResult,
        isSOS: false,
    };
}

// ─── Internal Helpers ────────────────────────────────

/**
 * Both rule-based AND AI layers must agree before alerting doctor.
 * This eliminates false positives that would cause alert fatigue.
 */
function determineSeverity(ruleTriggered: boolean, aiResult: AIVerdict | null): Severity {
    if (!ruleTriggered) return 'NORMAL';

    // AI unavailable — fall back to MONITOR (conservative)
    if (!aiResult) return 'MONITOR';

    if (aiResult.verdict === 'ALERT') return 'CRITICAL';
    if (aiResult.verdict === 'MONITOR') return 'MONITOR';
    return 'NORMAL';
}

function buildAlertPayload(
    escalationId: string,
    patientId: string,
    patientName: string,
    severity: Severity,
    rulesTriggered: string[],
    aiVerdict: string | null,
    aiReason: string | null,
    isSOS: boolean,
): PatientAlertPayload {
    return {
        escalationId,
        patientId,
        patientName,
        severity,
        rulesTriggered,
        aiVerdict,
        aiReason,
        isSOS,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Checks if a metric exceeds a threshold for N consecutive days.
 */
function checkConsecutive(
    logs: SymptomLog[],
    field: 'pain' | 'sleepHours',
    threshold: number,
    requiredDays: number,
    direction: 'above' | 'below',
): boolean {
    let consecutive = 0;

    for (const log of logs) {
        const value = log[field];
        if (value === null) break;

        const exceeds = direction === 'above' ? value > threshold : value < threshold;
        if (exceeds) {
            consecutive++;
            if (consecutive >= requiredDays) return true;
        } else {
            break;
        }
    }

    return false;
}

/**
 * Checks if ALL medications were missed for N consecutive days.
 */
function checkMedicationCompliance(logs: SymptomLog[], requiredDays: number): boolean {
    let consecutive = 0;

    for (const log of logs) {
        const meds = log.medicationTaken as Record<string, boolean> | null;
        if (!meds || Object.keys(meds).length === 0) break;

        const allMissed = Object.values(meds).every((taken) => !taken);
        if (allMissed) {
            consecutive++;
            if (consecutive >= requiredDays) return true;
        } else {
            break;
        }
    }

    return false;
}

/**
 * Checks if any metric increased by 4+ points between two consecutive days.
 */
function checkRapidDeterioration(latest: SymptomLog, previous: SymptomLog): boolean {
    const metrics: Array<'pain' | 'fatigue' | 'swelling'> = ['pain', 'fatigue', 'swelling'];

    for (const metric of metrics) {
        const curr = latest[metric];
        const prev = previous[metric];
        if (curr !== null && prev !== null && curr - prev >= ESCALATION_RULES.RAPID_CHANGE_POINTS) {
            return true;
        }
    }

    // For mood and appetite, deterioration means DECREASE
    const moodMetrics: Array<'mood' | 'appetite'> = ['mood', 'appetite'];
    for (const metric of moodMetrics) {
        const curr = latest[metric];
        const prev = previous[metric];
        if (curr !== null && prev !== null && prev - curr >= ESCALATION_RULES.RAPID_CHANGE_POINTS) {
            return true;
        }
    }

    return false;
}

/**
 * Checks if there's no improvement in the last 7 days.
 * "No improvement" = average pain/fatigue/swelling hasn't decreased at all.
 */
function checkPlateau(logs: SymptomLog[]): boolean {
    if (logs.length < ESCALATION_RULES.PLATEAU_NO_IMPROVEMENT_DAYS) return false;

    const recentLogs = logs.slice(0, ESCALATION_RULES.PLATEAU_NO_IMPROVEMENT_DAYS);

    const painValues = recentLogs.map((l) => l.pain).filter((v): v is number => v !== null);
    if (painValues.length < 3) return false;

    // Compare first half average to second half average
    const mid = Math.floor(painValues.length / 2);
    const firstHalf = painValues.slice(mid);
    const secondHalf = painValues.slice(0, mid);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    // No improvement = second half average is same or worse
    return secondAvg >= firstAvg;
}
