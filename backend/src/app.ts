import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { generalLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { createApiRouter } from './routes';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

/**
 * Creates and configures the Express app.
 * Separated from server.ts to enable testing without starting HTTP.
 */
export function createApp(deps: { db: PrismaClient; io: Server }): express.Application {
    const app = express();

    // ─── Security ──────────────────────────────────────
    app.use(helmet());
    app.use(cors({
        origin: env.FRONTEND_URL,
        credentials: true,
    }));

    // ─── Parsing ───────────────────────────────────────
    app.use(express.json({ limit: '1mb' }));

    // ─── Rate Limiting ─────────────────────────────────
    app.use(generalLimiter);

    // ─── Health Check ──────────────────────────────────
    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });

    // ─── API Routes ────────────────────────────────────
    app.use('/api', createApiRouter(deps));

    // ─── Global Error Handler (must be last) ───────────
    app.use(errorHandler);

    return app;
}
