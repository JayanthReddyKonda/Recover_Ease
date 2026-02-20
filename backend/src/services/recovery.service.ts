import { PrismaClient } from '@prisma/client';
import { RECOVERY_STAGES, MILESTONES } from '../config/constants';
import { logger } from '../config/logger';

/**
 * Determines the current recovery stage based on days since discharge.
 */
export function getRecoveryStage(daysSinceDischarge: number): {
    name: string;
    key: string;
    dayRange: string;
} | null {
    const stage = RECOVERY_STAGES.find(
        (s) => daysSinceDischarge >= s.minDay && daysSinceDischarge <= s.maxDay,
    );

    if (!stage) return null;

    const maxLabel = stage.maxDay === Infinity ? '+' : `${stage.maxDay}`;
    return {
        name: stage.name,
        key: stage.key,
        dayRange: `Day ${stage.minDay}–${maxLabel}`,
    };
}

/**
 * Checks and awards milestones for a patient.
 * Called after each symptom log.
 */
export async function checkAndAwardMilestones(
    patientId: string,
    deps: { db: PrismaClient },
): Promise<void> {
    try {
        const logs = await deps.db.symptomLog.findMany({
            where: { patientId },
            orderBy: { logDate: 'desc' },
            select: { logDate: true, pain: true, medicationTaken: true },
        });

        const existingMilestones = await deps.db.milestone.findMany({
            where: { patientId },
            select: { milestoneKey: true },
        });

        const earned = new Set(existingMilestones.map((m) => m.milestoneKey));
        const toCreate: Array<{ key: string; title: string; icon: string }> = [];

        // FIRST_LOG: patient has logged at least once
        if (logs.length >= 1 && !earned.has(MILESTONES.FIRST_LOG.key)) {
            toCreate.push(MILESTONES.FIRST_LOG);
        }

        // Streak milestones: consecutive daily logs
        const streak = calculateStreak(logs.map((l) => l.logDate));

        if (streak >= 3 && !earned.has(MILESTONES.STREAK_3.key)) {
            toCreate.push(MILESTONES.STREAK_3);
        }
        if (streak >= 7 && !earned.has(MILESTONES.STREAK_7.key)) {
            toCreate.push(MILESTONES.STREAK_7);
        }
        if (streak >= 14 && !earned.has(MILESTONES.STREAK_14.key)) {
            toCreate.push(MILESTONES.STREAK_14);
        }
        if (streak >= 30 && !earned.has(MILESTONES.STREAK_30.key)) {
            toCreate.push(MILESTONES.STREAK_30);
        }

        // PAIN_DECREASE: first pain reading was > 6 and latest is <= 4
        if (logs.length >= 3 && !earned.has(MILESTONES.PAIN_DECREASE.key)) {
            const firstPain = logs[logs.length - 1]?.pain;
            const latestPain = logs[0]?.pain;
            if (firstPain !== null && latestPain !== null && firstPain > 6 && latestPain <= 4) {
                toCreate.push(MILESTONES.PAIN_DECREASE);
            }
        }

        // Create all new milestones in a single transaction
        if (toCreate.length > 0) {
            await deps.db.milestone.createMany({
                data: toCreate.map((m) => ({
                    patientId,
                    milestoneKey: m.key,
                    title: m.title,
                    icon: m.icon,
                } as const)),
                skipDuplicates: true,
            });

            logger.info('Milestones awarded', { patientId, milestones: toCreate.map((m) => m.key) });
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Milestone check failed (non-critical)', { patientId, error: message });
    }
}

/**
 * Calculates the current consecutive-day log streak ending today.
 */
function calculateStreak(dates: Date[]): number {
    if (dates.length === 0) return 0;

    // Sort descending (most recent first)
    const sorted = [...dates]
        .map((d) => normalizeDate(d))
        .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const diffMs = sorted[i - 1].getTime() - sorted[i].getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (Math.abs(diffDays - 1) < 0.01) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

/**
 * Strips time component from a Date to midnight UTC.
 */
function normalizeDate(date: Date): Date {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}
