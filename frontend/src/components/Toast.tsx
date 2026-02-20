import { X, AlertTriangle, CheckCircle, Info, AlertCircle, Bell } from "lucide-react";
import clsx from "clsx";
import type { Toast as ToastT, ToastType } from "@/types";

const icons: Record<ToastType, typeof Info> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    alert: Bell,
};

const colors: Record<ToastType, string> = {
    success: "bg-emerald-50 border-emerald-300 text-emerald-800",
    error: "bg-red-50 border-red-300 text-red-800",
    warning: "bg-amber-50 border-amber-300 text-amber-800",
    info: "bg-blue-50 border-blue-300 text-blue-800",
    alert: "bg-purple-50 border-purple-300 text-purple-800",
};

interface Props {
    toast: ToastT;
    onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: Props) {
    const Icon = icons[toast.type];

    return (
        <div
            className={clsx(
                "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-card animate-in slide-in-from-right",
                colors[toast.type],
            )}
        >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                <p className="text-xs opacity-80">{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded p-0.5 hover:bg-black/5"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
