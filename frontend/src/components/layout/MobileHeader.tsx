import { Link } from "react-router-dom";
import { Heart, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

/** Compact header bar shown only on mobile (lg:hidden). */
export default function MobileHeader() {
    const { user } = useAuth();
    const connected = useStore((s) => s.connected);

    return (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200/60 bg-white/90 backdrop-blur-xl px-4 lg:hidden">
            <Link
                to="/dashboard"
                className="flex items-center gap-2"
            >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white">
                    <Heart className="h-3.5 w-3.5 fill-current" />
                </div>
                <span className="text-sm font-bold text-gray-900">
                    Recovery
                </span>
            </Link>
            <div className="flex items-center gap-3">
                {user?.role === "PATIENT" && (
                    <Link
                        to="/sos"
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <AlertTriangle className="h-5 w-5" />
                    </Link>
                )}
                <span
                    className={cn(
                        "h-2 w-2 rounded-full",
                        connected
                            ? "bg-emerald-400 shadow-glow-green"
                            : "bg-gray-300",
                    )}
                    title={connected ? "Connected" : "Disconnected"}
                />
            </div>
        </header>
    );
}
