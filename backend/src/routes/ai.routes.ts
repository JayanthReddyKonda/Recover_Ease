import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { aiLimiter } from '../middleware/rate-limiter';
import { parseSymptomSchema, patientInsightSchema } from '../schemas';
import {
    parseSymptomController,
    patientInsightController,
    doctorSummaryController,
} from '../controllers/ai.controller';

export function createAIRouter(deps: { db: PrismaClient }): Router {
    const router = Router();

    router.post('/parse-symptom', authenticate, authorize('PATIENT'), aiLimiter, validate(parseSymptomSchema), parseSymptomController(deps));
    router.post('/patient-insight', authenticate, authorize('DOCTOR'), aiLimiter, validate(patientInsightSchema), patientInsightController(deps));
    router.post('/doctor-summary', authenticate, authorize('DOCTOR'), aiLimiter, doctorSummaryController(deps));

    return router;
}
