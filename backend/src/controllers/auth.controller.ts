import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import * as authService from '../services/auth.service';
import { RegisterDTO, LoginDTO, ProfileUpdateDTO } from '../types';

/**
 * POST /api/auth/register
 */
export function registerController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body as RegisterDTO;
            const result = await authService.register(data, deps);
            res.status(201).json({ data: result });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * POST /api/auth/login
 */
export function loginController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body as LoginDTO;
            const result = await authService.login(data, deps);
            res.status(200).json({ data: result });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * GET /api/auth/me
 */
export function getMeController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = await authService.getMe(req.user!.id, deps);
            res.status(200).json({ data: user });
        } catch (error) {
            next(error);
        }
    };
}

/**
 * PUT /api/auth/profile
 */
export function updateProfileController(deps: { db: PrismaClient }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const data = req.body as ProfileUpdateDTO;
            const user = await authService.updateProfile(req.user!.id, data, deps);
            res.status(200).json({ data: user });
        } catch (error) {
            next(error);
        }
    };
}
