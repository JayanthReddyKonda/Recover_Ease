import { create } from "zustand";
import type { SafeUser, Toast, ToastType } from "@/types";

// ─── Auth Slice ─────────────────────────────────────────

interface AuthSlice {
    user: SafeUser | null;
    token: string | null;
    setAuth: (user: SafeUser, token: string) => void;
    setUser: (user: SafeUser) => void;
    logout: () => void;
}

// ─── Notification Slice ─────────────────────────────────

interface NotificationSlice {
    toasts: Toast[];
    addToast: (type: ToastType, title: string, message: string) => void;
    removeToast: (id: string) => void;
}

// ─── Socket Slice ───────────────────────────────────────

interface SocketSlice {
    connected: boolean;
    setConnected: (v: boolean) => void;
}

// ─── Combined Store ─────────────────────────────────────

type AppStore = AuthSlice & NotificationSlice & SocketSlice;

let toastCounter = 0;

export const useStore = create<AppStore>((set) => ({
    // Auth
    user: null,
    token: localStorage.getItem("rc_token"),
    setAuth: (user, token) => {
        localStorage.setItem("rc_token", token);
        set({ user, token });
    },
    setUser: (user) => set({ user }),
    logout: () => {
        localStorage.removeItem("rc_token");
        set({ user: null, token: null });
    },

    // Notifications
    toasts: [],
    addToast: (type, title, message) => {
        const id = `toast-${++toastCounter}-${Date.now()}`;
        set((s) => ({ toasts: [...s.toasts, { id, type, title, message }] }));
        // Auto-dismiss after 5 s
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 5000);
    },
    removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    // Socket
    connected: false,
    setConnected: (v) => set({ connected: v }),
}));
