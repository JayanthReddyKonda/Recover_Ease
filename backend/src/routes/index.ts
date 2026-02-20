import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { createAuthRouter } from './auth.routes';
import { createRequestRouter } from './request.routes';
import { createSymptomRouter } from './symptom.routes';
import { createPatientRouter, createEscalationRouter } from './patient.routes';
import { createAIRouter } from './ai.routes';

export function createApiRouter(deps: { db: PrismaClient; io: Server }): Router {
    const router = Router();

    router.use('/auth', createAuthRouter({ db: deps.db }));
    router.use('/requests', createRequestRouter(deps));
    router.use('/symptoms', createSymptomRouter(deps));
    router.use('/patients', createPatientRouter(deps));
    router.use('/escalations', createEscalationRouter({ db: deps.db }));
    router.use('/ai', createAIRouter({ db: deps.db }));

    return router;
}
