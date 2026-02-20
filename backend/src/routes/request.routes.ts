import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendRequestSchema } from '../schemas';
import {
    sendRequestController,
    getPendingController,
    getMyDoctorController,
    getMyPatientsController,
    acceptRequestController,
    rejectRequestController,
    disconnectController,
} from '../controllers/request.controller';

export function createRequestRouter(deps: { db: PrismaClient; io: Server }): Router {
    const router = Router();

    router.post('/send', authenticate, authorize('DOCTOR'), validate(sendRequestSchema), sendRequestController(deps));
    router.get('/pending', authenticate, getPendingController(deps));
    router.get('/my-doctor', authenticate, authorize('PATIENT'), getMyDoctorController(deps));
    router.get('/my-patients', authenticate, authorize('DOCTOR'), getMyPatientsController(deps));
    router.post('/:id/accept', authenticate, authorize('PATIENT'), acceptRequestController(deps));
    router.post('/:id/reject', authenticate, authorize('PATIENT'), rejectRequestController(deps));
    router.delete('/disconnect', authenticate, disconnectController(deps));

    return router;
}
