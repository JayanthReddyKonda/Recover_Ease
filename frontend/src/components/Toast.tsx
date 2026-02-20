import { motion } from "framer-motion";
import { X, AlertTriangle, CheckCircle, Info, AlertCircle, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { slideRightVariants } from "@/components/motion";
import type { Toast as ToastT, ToastType } from "@/types";

const icons: Record<ToastType, typeof Info> = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
    alert: Bell,
};

const colors: Record<ToastType, string> = {
    success: "border-emerald-200 bg-white text-emerald-800",
    error: "border-red-200 bg-white text-red-800",
    warning: "border-amber-200 bg-white text-amber-800",
    info: "border-primary-200 bg-white text-primary-800",
    alert: "border-purple-200 bg-white text-purple-800",
};

const iconColors: Record<ToastType, string> = {
    success: "text-emerald-500",
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-primary-500",
    alert: "text-purple-500",
};

interface Props {
    toast: ToastT;
    onDismiss: (id: string) => void;
}

export default function Toast({ toast, onDismiss }: Props) {
    const Icon = icons[toast.type];

    return (
        <motion.div
            layout
            variants={slideRightVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-soft backdrop-blur-sm",
                colors[toast.type],
            )}
        >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconColors[toast.type])} />
            <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold">{toast.title}</p>
                <p className="text-xs text-gray-500">{toast.message}</p>
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded-md p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Dismiss"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </motion.div>
    );
}
