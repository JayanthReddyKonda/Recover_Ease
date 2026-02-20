import http from 'http';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { logger } from './config/logger';
import { initializeSocket } from './socket/socket.manager';
import { createApp } from './app';

async function main(): Promise<void> {
    // Validate database connection
    try {
        await prisma.$connect();
        logger.info('Database connected');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Database connection failed', { error: message });
        process.exit(1);
    }

    // Create HTTP server and Socket.io
    const httpServer = http.createServer();
    const io = initializeSocket(httpServer);

    // Create Express app with injected dependencies
    const app = createApp({ db: prisma, io });
    httpServer.on('request', app);

    // Start listening
    httpServer.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`, {
            env: env.NODE_ENV,
            url: `http://localhost:${env.PORT}`,
        });
    });

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
        logger.info('Shutting down...');
        await prisma.$disconnect();
        io.close();
        httpServer.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((error) => {
    logger.error('Fatal startup error', { error: error instanceof Error ? error.message : 'Unknown' });
    process.exit(1);
});
