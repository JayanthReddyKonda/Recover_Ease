import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { reviewEscalationSchema } from '../schemas';
import {
    getPatientController,
    getPatientFullController,
    sosController,
    reviewEscalationController,
} from '../controllers/patient.controller';

export function createPatientRouter(deps: { db: PrismaClient; io: Server }): Router {
    const router = Router();

    router.get('/:id', authenticate, authorize('DOCTOR'), getPatientController(deps));
    router.get('/:id/full', authenticate, authorize('DOCTOR'), getPatientFullController(deps));
    router.post('/sos', authenticate, authorize('PATIENT'), sosController(deps));

    return router;
}

export function createEscalationRouter(deps: { db: PrismaClient }): Router {
    const router = Router();

    router.put('/:id/review', authenticate, authorize('DOCTOR'), validate(reviewEscalationSchema), reviewEscalationController(deps));

    return router;
}
