import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

/**
 * Custom application error with HTTP status code and machine-readable code.
 * Thrown by services and caught by the global error handler.
 */
export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public code: string,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Global error handler — must be registered LAST in the middleware chain.
 * Maps AppError to structured JSON. Any unexpected error becomes a 500.
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
        });
        return;
    }

    // Unexpected error — log full details, return generic message
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
    });

    res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
    });
}
