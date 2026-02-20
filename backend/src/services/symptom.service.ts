import { Prisma, PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { AppError } from '../middleware/error-handler';
import { LogSymptomDTO } from '../types';
import { runEscalationCheck } from './escalation.service';
import { checkAndAwardMilestones } from './recovery.service';
import { logger } from '../config/logger';

/**
 * Creates or updates a symptom log for the given date (defaults to today).
 * Triggers escalation check and milestone check asynchronously.
 */
export async function logSymptoms(
    patientId: string,
    data: LogSymptomDTO,
    deps: { db: PrismaClient; io: Server },
): Promise<{ logId: string; isNew: boolean }> {
    const logDate = data.logDate
        ? new Date(data.logDate + 'T00:00:00.000Z')
        : getTodayUTC();

    const existing = await deps.db.symptomLog.findUnique({
        where: { patientId_logDate: { patientId, logDate } },
    });

    let log;
    let isNew: boolean;

    if (existing) {
        // Update existing log for this date
        log = await deps.db.symptomLog.update({
            where: { id: existing.id },
            data: {
                pain: data.pain ?? existing.pain,
                fatigue: data.fatigue ?? existing.fatigue,
                swelling: data.swelling ?? existing.swelling,
                sleepHours: data.sleepHours ?? existing.sleepHours,
                mood: data.mood ?? existing.mood,
                appetite: data.appetite ?? existing.appetite,
                rawInput: data.rawInput ?? existing.rawInput,
                voiceInput: data.voiceInput ?? existing.voiceInput,
                medicationTaken: data.medicationTaken ?? existing.medicationTaken ?? Prisma.JsonNull,
            },
        });
        isNew = false;
    } else {
        log = await deps.db.symptomLog.create({
            data: {
                patientId,
                logDate,
                pain: data.pain ?? null,
                fatigue: data.fatigue ?? null,
                swelling: data.swelling ?? null,
                sleepHours: data.sleepHours ?? null,
                mood: data.mood ?? null,
                appetite: data.appetite ?? null,
                rawInput: data.rawInput ?? null,
                voiceInput: data.voiceInput ?? false,
                medicationTaken: data.medicationTaken ?? Prisma.JsonNull,
            },
        });
        isNew = true;
    }

    // Fire-and-forget: escalation check — failure must not block symptom log response
    runEscalationCheck(patientId, false, deps).catch((err) =>
        logger.warn('Escalation check failed (non-critical)', {
            patientId,
            error: err instanceof Error ? err.message : 'Unknown',
        }),
    );

    // Fire-and-forget: milestone check
    checkAndAwardMilestones(patientId, { db: deps.db }).catch((err) =>
        logger.warn('Milestone check failed (non-critical)', {
            patientId,
            error: err instanceof Error ? err.message : 'Unknown',
        }),
    );

    return { logId: log.id, isNew };
}

/**
 * Returns all symptom logs for a patient, ordered by date descending.
 */
export async function getLogs(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<unknown[]> {
    return deps.db.symptomLog.findMany({
        where: { patientId },
        orderBy: { logDate: 'desc' },
        take: 90,
    });
}

/**
 * Returns today's symptom log for a patient (if exists).
 */
export async function getTodayLog(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<unknown | null> {
    const today = getTodayUTC();

    return deps.db.symptomLog.findUnique({
        where: { patientId_logDate: { patientId, logDate: today } },
    });
}

/**
 * Returns a summary of a patient's symptom data for doctor view.
 * Includes averages, trend direction, and days since last log.
 */
export async function getSymptomSummary(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<{
    totalLogs: number;
    averages: Record<string, number | null>;
    lastLogDate: Date | null;
    trendDirection: 'improving' | 'worsening' | 'stable' | 'insufficient_data';
}> {
    const logs = await deps.db.symptomLog.findMany({
        where: { patientId },
        orderBy: { logDate: 'desc' },
        take: 14,
    });

    if (logs.length === 0) {
        return {
            totalLogs: 0,
            averages: { pain: null, fatigue: null, swelling: null, sleepHours: null, mood: null, appetite: null },
            lastLogDate: null,
            trendDirection: 'insufficient_data',
        };
    }

    const averages = {
        pain: average(logs.map((l) => l.pain)),
        fatigue: average(logs.map((l) => l.fatigue)),
        swelling: average(logs.map((l) => l.swelling)),
        sleepHours: average(logs.map((l) => l.sleepHours)),
        mood: average(logs.map((l) => l.mood)),
        appetite: average(logs.map((l) => l.appetite)),
    };

    const totalLogs = await deps.db.symptomLog.count({ where: { patientId } });

    return {
        totalLogs,
        averages,
        lastLogDate: logs[0].logDate,
        trendDirection: determineTrend(logs),
    };
}

/**
 * Returns trend data for chart rendering — up to 30 days of logs.
 */
export async function getSymptomTrend(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<unknown[]> {
    return deps.db.symptomLog.findMany({
        where: { patientId },
        orderBy: { logDate: 'asc' },
        take: 30,
        select: {
            logDate: true,
            pain: true,
            fatigue: true,
            swelling: true,
            sleepHours: true,
            mood: true,
            appetite: true,
            medicationTaken: true,
        },
    });
}

// ─── Helpers ─────────────────────────────────────────

function getTodayUTC(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function average(values: (number | null)[]): number | null {
    const numbers = values.filter((v): v is number => v !== null);
    if (numbers.length === 0) return null;
    return Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 10) / 10;
}

function determineTrend(
    logs: Array<{ pain: number | null }>,
): 'improving' | 'worsening' | 'stable' | 'insufficient_data' {
    const painValues = logs.map((l) => l.pain).filter((v): v is number => v !== null);
    if (painValues.length < 3) return 'insufficient_data';

    // Compare first half (most recent) vs second half (older)
    const mid = Math.floor(painValues.length / 2);
    const recent = painValues.slice(0, mid);
    const older = painValues.slice(mid);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = olderAvg - recentAvg;
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'worsening';
    return 'stable';
}
