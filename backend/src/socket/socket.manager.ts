import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
    ServerToClientEvents,
    ClientToServerEvents,
    SocketData,
} from '../types/socket.types';

/**
 * Initializes Socket.io server with typed events.
 * Rooms: doctor:${id}, patient:${id}, doctor_alerts
 */
export function initializeSocket(httpServer: HttpServer): Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
    const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
        cors: {
            origin: env.FRONTEND_URL,
            methods: ['GET', 'POST'],
        },
    });

    io.on('connection', (socket) => {
        logger.info('Socket connected', { socketId: socket.id });

        socket.on('join_doctor_room', (doctorId: string) => {
            socket.join(`doctor:${doctorId}`);
            // Doctors also join the shared alerts room
            socket.join('doctor_alerts');
            logger.debug('Doctor joined room', { doctorId, socketId: socket.id });
        });

        socket.on('join_patient_room', (patientId: string) => {
            socket.join(`patient:${patientId}`);
            logger.debug('Patient joined room', { patientId, socketId: socket.id });
        });

        socket.on('disconnect', () => {
            logger.debug('Socket disconnected', { socketId: socket.id });
        });
    });

    return io;
}
