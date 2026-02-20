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
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600 border-t-transparent" />
                    <span className="text-xs text-gray-400">Loading…</span>
                </div>
            </div>
        );
    }

    /* ── Auth guards ──── */
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requiredRole && user?.role !== requiredRole)
        return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen bg-gray-50/80">
            <Sidebar />
            <MobileHeader />

            {/* Main content – pushed right on desktop to make room for sidebar */}
            <main className="lg:pl-[260px]">
                <div className="mx-auto max-w-5xl px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-10">
                    <Outlet />
                </div>
            </main>

            <MobileNav />
            <ToastContainer />
        </div>
    );
}
