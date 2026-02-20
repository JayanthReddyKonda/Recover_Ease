import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as groqService from '../services/groq.service';
import { redis } from '../config/redis';
import { CACHE_TTL } from '../config/constants';
import { AppError } from '../middleware/error-handler';

/**
 * POST /api/ai/parse-symptom
 * Parses natural language / voice input into structured symptom data.
 */
export function parseSymptomController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { rawInput } = req.body as { rawInput: string };

            // Get patient medications for context
            const patient = await deps.db.user.findUnique({
                where: { id: req.user!.id },
                select: { medications: true },
            });

            const parsed = await groqService.parseSymptomInput(
                rawInput,
                patient?.medications ?? [],
            );

            if (!parsed) {
                throw new AppError(
                    'Could not parse symptoms from input. Please try manual entry.',
                    422,
                    'PARSE_FAILED',
                );
            }

            res.status(200).json({ data: parsed });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/ai/patient-insight
 * Generates AI insight for a specific patient. Cached for 1 hour.
 */
export function patientInsightController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { patientId } = req.body as { patientId: string };

            // Check cache first
            const cacheKey = `insight:${patientId}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                res.status(200).json({ data: JSON.parse(cached), cached: true });
                return;
            }

            // Get patient info and recent logs
            const patient = await deps.db.user.findUnique({
                where: { id: patientId },
                select: { name: true, condition: true },
            });

            if (!patient) {
                throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
            }

            const logs = await deps.db.symptomLog.findMany({
                where: { patientId },
                orderBy: { logDate: 'desc' },
                take: 14,
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

            const insight = await groqService.generatePatientInsight(
                patient.name,
                patient.condition,
                logs,
            );

            if (!insight) {
                throw new AppError('Could not generate insight. Please try again later.', 503, 'INSIGHT_FAILED');
            }

            // Cache the result
            await redis.setex(cacheKey, CACHE_TTL.PATIENT_INSIGHT, JSON.stringify(insight));

            res.status(200).json({ data: insight });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/ai/doctor-summary
 * Generates AI summary across all doctor's patients. Cached for 30 min.
 */
export function doctorSummaryController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const doctorId = req.user!.id;

            // Check cache
            const cacheKey = `summary:${doctorId}`;
            const cached = await redis.get(cacheKey);
            if (cached) {
                res.status(200).json({ data: JSON.parse(cached), cached: true });
                return;
            }

            // Get all connected patients with stats
            const connections = await deps.db.doctorPatientRequest.findMany({
                where: { doctorId, status: 'ACCEPTED' },
                include: {
                    patient: { select: { id: true, name: true, condition: true } },
                },
            });

            const patientData = await Promise.all(
                connections.map(async (conn) => {
                    const activeEscalations = await deps.db.escalation.count({
                        where: { patientId: conn.patientId, status: 'ACTIVE' },
                    });

                    const latestLog = await deps.db.symptomLog.findFirst({
                        where: { patientId: conn.patientId },
                        orderBy: { logDate: 'desc' },
                        select: { pain: true },
                    });

                    return {
                        name: conn.patient.name,
                        condition: conn.patient.condition,
                        activeEscalations,
                        latestPain: latestLog?.pain ?? null,
                    };
                }),
            );

            const summary = await groqService.generateDoctorSummary(patientData);

            if (!summary) {
                throw new AppError('Could not generate summary. Please try again later.', 503, 'SUMMARY_FAILED');
            }

            await redis.setex(cacheKey, CACHE_TTL.DOCTOR_SUMMARY, JSON.stringify(summary));

            res.status(200).json({ data: summary });
        } catch (error) {
            next(error);
        }
    };
}
