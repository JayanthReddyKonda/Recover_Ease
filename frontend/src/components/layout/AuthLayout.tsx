import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import Navbar from "./Navbar";
import ToastContainer from "@/components/ToastContainer";
import Skeleton from "@/components/Skeleton";

/**
 * Generic authenticated layout for routes shared between PATIENT and DOCTOR
 * (profile, requests, dashboard).
 */
export default function AuthLayout() {
    const { isLoading, isAuthenticated } = useAuth();
    useSocket();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Skeleton className="h-6 w-48" />
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="mx-auto max-w-6xl px-4 py-6">
                <Outlet />
            </main>
            <ToastContainer />
        </div>
    );
}
