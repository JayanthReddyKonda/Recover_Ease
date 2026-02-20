import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rate-limiter';
import { registerSchema, loginSchema, profileUpdateSchema } from '../schemas';
import {
    registerController,
    loginController,
    getMeController,
    updateProfileController,
} from '../controllers/auth.controller';

export function createAuthRouter(deps: { db: PrismaClient }): Router {
    const router = Router();

    router.post('/register', authLimiter, validate(registerSchema), registerController(deps));
    router.post('/login', authLimiter, validate(loginSchema), loginController(deps));
    router.get('/me', authenticate, getMeController(deps));
    router.put('/profile', authenticate, validate(profileUpdateSchema), updateProfileController(deps));

    return router;
}
