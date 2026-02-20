import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileHeader from "./MobileHeader";
import ToastContainer from "@/components/ToastContainer";
import type { Role } from "@/types";

interface AppShellProps {
    /** If set, restricts to this role – otherwise any authenticated user is allowed. */
    requiredRole?: Role;
}

/**
 * Unified authenticated layout:
 * - Desktop: persistent sidebar on the left, content on the right
 * - Mobile: compact top header + bottom tab bar
 *
 * Replaces the old PatientLayout / DoctorLayout / AuthLayout.
 */
export default function AppShell({ requiredRole }: AppShellProps) {
    const { user, isLoading, isAuthenticated } = useAuth();
    useSocket();

    /* ── Loading spinner ──── */
    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(135deg, #0d1117 0%, #14192b 100%)" }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                            <span className="text-white font-bold text-lg">♥</span>
                        </div>
                        <div className="absolute -inset-1 rounded-2xl animate-pulse-soft" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", opacity: 0.3 }} />
                    </div>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
                </div>
            </div>
        );
    }

    /* ── Auth guards ──── */
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requiredRole && user?.role !== requiredRole)
        return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen" style={{ backgroundColor: "#f0f1f8", backgroundImage: "radial-gradient(circle at 20% 0%, rgb(79 70 229 / 0.07) 0%, transparent 45%), radial-gradient(circle at 80% 100%, rgb(124 58 237 / 0.05) 0%, transparent 45%)" }}>
            <Sidebar />
            <MobileHeader />

            {/* Main content – pushed right on desktop to make room for sidebar */}
            <main className="lg:pl-[260px]">
                <div className="mx-auto max-w-5xl px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-10">
                    <Outlet />
                </div>
            </main>

            <MobileNav />
            <ToastContainer />
        </div>
    );
}
