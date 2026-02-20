import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times: number): number | null {
        if (times > 3) {
            logger.error('Redis connection failed after 3 retries — giving up');
            return null;
        }
        // Exponential backoff: 200ms, 400ms, 800ms
        return Math.min(times * 200, 2000);
    },
});

redis.on('connect', () => {
    logger.info('Redis connected');
});

redis.on('error', (error: Error) => {
    logger.error('Redis error', { error: error.message });
});

export { redis };
