import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import * as symptomService from '../services/symptom.service';
import { LogSymptomDTO } from '../types';

/**
 * POST /api/symptoms/log
 */
export function logSymptomsController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body as LogSymptomDTO;
            const result = await symptomService.logSymptoms(req.user!.id, data, deps);
            const status = result.isNew ? 201 : 200;
            res.status(status).json({ data: result, message: result.isNew ? 'Symptom log created' : 'Symptom log updated' });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/symptoms/logs
 */
export function getLogsController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const logs = await symptomService.getLogs(req.user!.id, deps);
            res.status(200).json({ data: logs });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/symptoms/today
 */
export function getTodayController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const log = await symptomService.getTodayLog(req.user!.id, deps);
            res.status(200).json({ data: log });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/symptoms/summary/:patientId
 */
export function getSummaryController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const summary = await symptomService.getSymptomSummary(String(req.params.patientId), deps);
            res.status(200).json({ data: summary });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/symptoms/trend/:patientId
 */
export function getTrendController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const trend = await symptomService.getSymptomTrend(String(req.params.patientId), deps);
            res.status(200).json({ data: trend });
        } catch (error) {
            next(error);
        }
    };
}
