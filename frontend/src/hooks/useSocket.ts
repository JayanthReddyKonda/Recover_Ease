import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useStore } from "@/store/useStore";
import { socketStore } from "@/lib/socketStore";
import type {
    ChatRequestAcceptedEvent,
    ChatRequestEvent,
    MilestoneEarnedEvent,
    NewMessageEvent,
    PatientAlertEvent,
    TypingEvent,
} from "@/types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export function useSocket() {
    const { user, token, setConnected, addToast } = useStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!user || !token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket", "polling"],
        });

        socketRef.current = socket;
        socketStore.set(socket);

        socket.on("connect", () => {
            setConnected(true);
            if (user.role === "DOCTOR") {
                socket.emit("join_doctor_room", { doctor_id: user.id });
            } else {
                socket.emit("join_patient_room", { patient_id: user.id });
            }
        });

        socket.on("disconnect", () => setConnected(false));

        socket.on("patient_alert", (data: PatientAlertEvent) => {
            const severity = data.is_sos ? "error" : "warning";
            const title = data.is_sos ? "SOS Alert!" : "Patient Escalation";
            addToast(severity, title, `${data.patient_name} needs attention`);
            notifyBrowser(title, `${data.patient_name} – ${data.severity}`);
        });

        socket.on("milestone_earned", (data: MilestoneEarnedEvent) => {
            data.milestones.forEach((m) => {
                addToast("success", `${m.icon} ${m.title}`, "You earned a milestone!");
                notifyBrowser("Milestone Earned!", m.title);
            });
        });

        socket.on("chat_request", (data: ChatRequestEvent) => {
            addToast("info", "Chat Request", `${data.patient_name} wants to chat`);
            notifyBrowser("New Chat Request", `${data.patient_name} – ${data.title}`);
        });

        socket.on("chat_request_accepted", (data: ChatRequestAcceptedEvent) => {
            addToast("success", "Chat Accepted", `Dr. ${data.doctor_name} accepted your chat request`);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            socketStore.set(null);
            setConnected(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, token]);

    return socketRef;
}

/**
 * Subscribe to real-time messages for a specific chat session.
 * Uses the module-level socket singleton set by useSocket.
 */
export function useChatSocket(
    sessionId: string | null,
    onMessage: (event: NewMessageEvent) => void,
    onTyping: (event: TypingEvent) => void,
) {
    useEffect(() => {
        const socket = socketStore.get();
        if (!socket || !sessionId) return;

        socket.emit("join_chat_room", { session_id: sessionId });

        const handleMessage = (data: NewMessageEvent) => {
            if (data.session_id === sessionId) onMessage(data);
        };
        const handleTyping = (data: TypingEvent) => {
            if (data.session_id === sessionId) onTyping(data);
        };

        socket.on("new_message", handleMessage);
        socket.on("typing", handleTyping);

        return () => {
            socket.emit("leave_chat_room", { session_id: sessionId });
            socket.off("new_message", handleMessage);
            socket.off("typing", handleTyping);
        };
    }, [sessionId]);
}

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

