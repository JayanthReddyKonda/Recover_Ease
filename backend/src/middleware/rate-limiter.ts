import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants';

/**
 * General API rate limiter — 100 req / 15 min per IP.
 */
export const generalLimiter = rateLimit({
    windowMs: RATE_LIMITS.GENERAL_WINDOW_MS,
    max: RATE_LIMITS.GENERAL_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later', code: 'RATE_LIMITED' },
});

/**
 * AI endpoint rate limiter — 20 req / 15 min per IP.
 * More aggressive to stay within Groq free tier budget.
 */
export const aiLimiter = rateLimit({
    windowMs: RATE_LIMITS.AI_WINDOW_MS,
    max: RATE_LIMITS.AI_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'AI rate limit exceeded, please try again later', code: 'AI_RATE_LIMITED' },
});

/**
 * Auth endpoint rate limiter — 10 attempts / 15 min per IP.
 * Protects against brute force.
 */
export const authLimiter = rateLimit({
    windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
    max: RATE_LIMITS.AUTH_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts, please try again later', code: 'AUTH_RATE_LIMITED' },
});
