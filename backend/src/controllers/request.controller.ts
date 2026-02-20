import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import * as requestService from '../services/request.service';

/**
 * POST /api/requests/send
 */
export function sendRequestController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { patientId } = req.body as { patientId: string };
            const result = await requestService.sendRequest(req.user!.id, patientId, deps);
            res.status(201).json({ data: result, message: 'Connection request sent' });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/requests/pending
 */
export function getPendingController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const requests = await requestService.getPendingRequests(
                req.user!.id,
                req.user!.role,
                deps,
            );
            res.status(200).json({ data: requests });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/requests/my-doctor
 */
export function getMyDoctorController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const doctor = await requestService.getMyDoctor(req.user!.id, deps);
            res.status(200).json({ data: doctor });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/requests/my-patients
 */
export function getMyPatientsController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const patients = await requestService.getMyPatients(req.user!.id, deps);
            res.status(200).json({ data: patients });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/requests/:id/accept
 */
export function acceptRequestController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await requestService.acceptRequest(String(req.params.id), req.user!.id, deps);
            res.status(200).json({ message: 'Request accepted' });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/requests/:id/reject
 */
export function rejectRequestController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await requestService.rejectRequest(String(req.params.id), req.user!.id, deps);
            res.status(200).json({ message: 'Request rejected' });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * DELETE /api/requests/disconnect
 */
export function disconnectController(deps: { db: PrismaClient; io: Server }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await requestService.disconnect(req.user!.id, req.user!.role, deps);
            res.status(200).json({ message: 'Disconnected successfully' });
        } catch (error) {
            next(error);
        }
    };
}
