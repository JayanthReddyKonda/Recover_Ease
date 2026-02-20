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
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between px-4 lg:hidden" style={{ background: "linear-gradient(to bottom, #0d1117f5, #111520ee)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                    <Heart className="h-3.5 w-3.5 fill-white text-white" />
                </div>
                <span className="text-sm font-bold text-white">RecoverEase</span>
            </Link>
            <div className="flex items-center gap-3">
                {user?.role === "PATIENT" && (
                    <Link
                        to="/sos"
                        className="flex h-8 w-8 items-center justify-center rounded-xl transition-all" style={{ background: "rgba(239,68,68,0.15)" }}
                    >
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                    </Link>
                )}
                <div
                    className={cn(
                        "h-2 w-2 rounded-full transition-all duration-500",
                        connected ? "bg-emerald-400 shadow-glow-green" : "bg-white/20"
                    )}
                    title={connected ? "Live" : "Offline"}
                />
            </div>
        </header>
    );
}
