import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env before validation
dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3001),
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
    REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
    GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    process.exit(1);
}

export const env = parsed.data;
