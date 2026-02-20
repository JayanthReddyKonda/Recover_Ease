import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import Navbar from "./Navbar";
import ToastContainer from "@/components/ToastContainer";
import Skeleton from "@/components/Skeleton";

/**
 * Shell for authenticated PATIENT pages.
 * Redirects to /login if unauthenticated or to /dashboard if the user is a doctor.
 */
export default function PatientLayout() {
    const { user, isLoading, isAuthenticated } = useAuth();
    useSocket();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Skeleton className="h-6 w-48" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== "PATIENT") return <Navigate to="/dashboard" replace />;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-6">
                <Outlet />
            </main>
            <ToastContainer />
        </div>
    );
}
