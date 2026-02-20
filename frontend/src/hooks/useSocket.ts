import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "@/store/useStore";
import type { MilestoneEarnedEvent, PatientAlertEvent } from "@/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

/**
 * Manages a single Socket.IO connection scoped to the authenticated user.
 * - Patients join "patient:{id}" room.
 * - Doctors  join "doctor:{id}" room.
 * Listens for real-time events and surfaces them as toasts + browser notifications.
 */
export function useSocket() {
    const { user, token, setConnected, addToast } = useStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!user || !token || !SOCKET_URL) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            // Ask server to join the correct room
            const room =
                user.role === "DOCTOR" ? `doctor:${user.id}` : `patient:${user.id}`;
            socket.emit("join", { room });
        });

        socket.on("disconnect", () => setConnected(false));

        // ─── Doctor: alert when patient submits concerning log / SOS ────
        socket.on("patient_alert", (data: PatientAlertEvent) => {
            const severity = data.is_sos ? "error" : "warning";
            const title = data.is_sos ? "SOS Alert!" : "Patient Escalation";
            addToast(severity, title, `${data.patient_name} needs attention`);
            notifyBrowser(title, `${data.patient_name} – ${data.severity}`);
        });

        // ─── Patient: milestone earned ─────────────────────────────────
        socket.on("milestone_earned", (data: MilestoneEarnedEvent) => {
            data.milestones.forEach((m) => {
                addToast("success", `${m.icon} ${m.title}`, "You earned a milestone!");
                notifyBrowser("Milestone Earned!", m.title);
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setConnected(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, token]);

    return socketRef;
}

// ─── Browser Notification (feature-detected) ────────────

function notifyBrowser(title: string, body: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.svg" });
    } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((p) => {
            if (p === "granted") new Notification(title, { body, icon: "/favicon.svg" });
        });
    }
}
