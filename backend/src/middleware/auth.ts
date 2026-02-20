import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, Role } from '../types';
import { AppError } from './error-handler';

// Extend Express Request to include authenticated user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

/**
 * Verifies JWT token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }
}

/**
 * Factory: restricts access to specific roles.
 * Must be used AFTER authenticate middleware.
 */
export function authorize(...roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
        }

        if (!roles.includes(req.user.role)) {
            throw new AppError('Access denied for your role', 403, 'ACCESS_DENIED');
        }

        next();
    };
}
