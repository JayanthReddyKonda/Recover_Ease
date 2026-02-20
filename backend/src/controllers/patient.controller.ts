import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import * as patientService from '../services/patient.service';

/**
 * GET /api/patients/:id
 */
export function getPatientController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patient = await patientService.getPatientProfile(
                String(req.params.id),
                req.user!.id,
                deps,
            );
            res.status(200).json({ data: patient });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/patients/:id/full
 */
export function getPatientFullController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await patientService.getPatientFull(
                String(req.params.id),
                req.user!.id,
                deps,
            );
            res.status(200).json({ data: result });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/patients/sos
 */
export function sosController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await patientService.triggerSOS(req.user!.id, deps);
            res.status(200).json({ message: 'SOS alert sent' });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * PUT /api/escalations/:id/review
 */
export function reviewEscalationController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await patientService.reviewEscalation(String(req.params.id), req.user!.id, deps);
            res.status(200).json({ message: 'Escalation reviewed' });
        } catch (error) {
            next(error);
        }
    };
}
