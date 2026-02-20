import { z } from 'zod';

// ─── Auth Schemas ────────────────────────────────────

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['PATIENT', 'DOCTOR']),
    condition: z.string().max(200).optional(),
    dischargeDate: z.string().datetime({ offset: true }).optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
    caregiverEmail: z.string().email().optional().or(z.literal('')),
    medications: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const profileUpdateSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    condition: z.string().max(200).optional(),
    dischargeDate: z.string().optional(),
    caregiverEmail: z.string().email().optional().or(z.literal('')),
    medications: z.array(z.string()).optional(),
});

// ─── Symptom Schemas ─────────────────────────────────

export const logSymptomSchema = z.object({
    pain: z.number().int().min(1).max(10).optional(),
    fatigue: z.number().int().min(1).max(10).optional(),
    swelling: z.number().int().min(1).max(10).optional(),
    sleepHours: z.number().min(0).max(24).optional(),
    mood: z.number().int().min(1).max(10).optional(),
    appetite: z.number().int().min(1).max(10).optional(),
    rawInput: z.string().max(2000).optional(),
    voiceInput: z.boolean().optional(),
    medicationTaken: z.record(z.boolean()).optional(),
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'logDate must be YYYY-MM-DD').optional(),
});

// ─── AI Schemas ──────────────────────────────────────

export const parseSymptomSchema = z.object({
    rawInput: z.string().min(1, 'Input is required').max(2000),
});

export const patientInsightSchema = z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
});

export const doctorSummarySchema = z.object({
    // No required body — uses authenticated doctor's ID
});

// ─── Request Schemas ─────────────────────────────────

export const sendRequestSchema = z.object({
    patientId: z.string().min(1, 'Patient ID is required'),
});

// ─── Escalation Schemas ──────────────────────────────

export const reviewEscalationSchema = z.object({
    notes: z.string().max(1000).optional(),
});
