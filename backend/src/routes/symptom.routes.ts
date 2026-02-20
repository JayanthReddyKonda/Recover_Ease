import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logSymptomSchema } from '../schemas';
import {
    logSymptomsController,
    getLogsController,
    getTodayController,
    getSummaryController,
    getTrendController,
} from '../controllers/symptom.controller';

export function createSymptomRouter(deps: { db: PrismaClient; io: Server }): Router {
    const router = Router();

    router.post('/log', authenticate, authorize('PATIENT'), validate(logSymptomSchema), logSymptomsController(deps));
    router.get('/logs', authenticate, authorize('PATIENT'), getLogsController(deps));
    router.get('/today', authenticate, authorize('PATIENT'), getTodayController(deps));
    router.get('/summary/:patientId', authenticate, authorize('DOCTOR'), getSummaryController(deps));
    router.get('/trend/:patientId', authenticate, authorize('DOCTOR'), getTrendController(deps));

    return router;
}
