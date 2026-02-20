import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import Skeleton from "@/components/Skeleton";

// Layouts (keep eager – tiny)
import PatientLayout from "@/components/layout/PatientLayout";
import DoctorLayout from "@/components/layout/DoctorLayout";
import AuthLayout from "@/components/layout/AuthLayout";

// Lazy-loaded pages (code-split for smaller initial bundle)
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const PatientDashboard = lazy(() => import("@/pages/PatientDashboard"));
const DoctorDashboard = lazy(() => import("@/pages/DoctorDashboard"));
const SymptomLogPage = lazy(() => import("@/pages/SymptomLogPage"));
const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const MilestonesPage = lazy(() => import("@/pages/MilestonesPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const RequestsPage = lazy(() => import("@/pages/RequestsPage"));
const PatientsListPage = lazy(() => import("@/pages/PatientsListPage"));
const PatientDetailPage = lazy(() => import("@/pages/PatientDetailPage"));
const SOSPage = lazy(() => import("@/pages/SOSPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageLoader() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <Skeleton className="h-6 w-48" />
        </div>
    );
}

/**
 * Picks the right dashboard based on role.
 */
function DashboardRouter() {
    const { user, isLoading } = useAuth();
    if (isLoading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return user.role === "DOCTOR" ? <DoctorDashboard /> : <PatientDashboard />;
}

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Patient routes */}
                    <Route element={<PatientLayout />}>
                        <Route path="/log" element={<SymptomLogPage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/milestones" element={<MilestonesPage />} />
                        <Route path="/sos" element={<SOSPage />} />
                    </Route>

                    {/* Doctor routes */}
                    <Route element={<DoctorLayout />}>
                        <Route path="/patients" element={<PatientsListPage />} />
                        <Route path="/patients/:id" element={<PatientDetailPage />} />
                    </Route>

                    {/* Shared authenticated routes (both roles) */}
                    <Route element={<AuthLayout />}>
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/requests" element={<RequestsPage />} />
                        <Route path="/dashboard" element={<DashboardRouter />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
