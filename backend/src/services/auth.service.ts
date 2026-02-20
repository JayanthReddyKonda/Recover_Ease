import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AUTH } from '../config/constants';
import { RegisterDTO, LoginDTO, SafeUser, AuthResponse, JwtPayload, ProfileUpdateDTO } from '../types';
import { AppError } from '../middleware/error-handler';

/**
 * Registers a new user. Returns token and safe user data.
 */
export async function register(
    data: RegisterDTO,
    deps: { db: PrismaClient },
): Promise<AuthResponse> {
    const existingUser = await deps.db.user.findUnique({
        where: { email: data.email },
    });

    if (existingUser) {
        throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
    }

    const hashedPassword = await bcrypt.hash(data.password, AUTH.BCRYPT_ROUNDS);

    const user = await deps.db.user.create({
        data: {
            name: data.name,
            email: data.email,
            password: hashedPassword,
            role: data.role,
            condition: data.condition ?? null,
            dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null,
            caregiverEmail: data.caregiverEmail || null,
            medications: data.medications ?? [],
        },
    });

    const safeUser = stripPassword(user);
    const token = generateToken(safeUser);

    return { token, user: safeUser };
}

/**
 * Authenticates a user by email/password. Returns token and safe user data.
 */
export async function login(
    data: LoginDTO,
    deps: { db: PrismaClient },
): Promise<AuthResponse> {
    const user = await deps.db.user.findUnique({
        where: { email: data.email },
    });

    if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const passwordValid = await bcrypt.compare(data.password, user.password);
    if (!passwordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const safeUser = stripPassword(user);
    const token = generateToken(safeUser);

    return { token, user: safeUser };
}

/**
 * Returns the current user's profile (from JWT payload).
 */
export async function getMe(
    userId: string,
    deps: { db: PrismaClient },
): Promise<SafeUser> {
    const user = await deps.db.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return stripPassword(user);
}

/**
 * Updates the current user's profile.
 */
export async function updateProfile(
    userId: string,
    data: ProfileUpdateDTO,
    deps: { db: PrismaClient },
): Promise<SafeUser> {
    const user = await deps.db.user.update({
        where: { id: userId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.condition !== undefined && { condition: data.condition }),
            ...(data.dischargeDate !== undefined && { dischargeDate: new Date(data.dischargeDate) }),
            ...(data.caregiverEmail !== undefined && { caregiverEmail: data.caregiverEmail || null }),
            ...(data.medications !== undefined && { medications: data.medications }),
        },
    });

    return stripPassword(user);
}

// ─── Helpers ─────────────────────────────────────────

function stripPassword(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    condition: string | null;
    dischargeDate: Date | null;
    caregiverEmail: string | null;
    medications: string[];
    createdAt: Date;
    password: string;
}): SafeUser {
    const { password: _, ...safeUser } = user;
    return safeUser as SafeUser;
}

function generateToken(user: SafeUser): string {
    const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, env.JWT_SECRET, { expiresIn: AUTH.TOKEN_EXPIRY });
}
