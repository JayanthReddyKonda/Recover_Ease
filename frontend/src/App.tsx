import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";

// Layout (single unified shell)
import AppShell from "@/components/layout/AppShell";

// Lazy-loaded pages
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
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

function PageLoader() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
    );
}

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

                    {/* Patient-only routes */}
                    <Route element={<AppShell requiredRole="PATIENT" />}>
                        <Route path="/log" element={<SymptomLogPage />} />
                        <Route path="/history" element={<HistoryPage />} />
                        <Route path="/milestones" element={<MilestonesPage />} />
                        <Route path="/sos" element={<SOSPage />} />
                    </Route>

                    {/* Doctor-only routes */}
                    <Route element={<AppShell requiredRole="DOCTOR" />}>
                        <Route path="/patients" element={<PatientsListPage />} />
                        <Route path="/patients/:id" element={<PatientDetailPage />} />
                    </Route>

                    {/* Shared authenticated routes */}
                    <Route element={<AppShell />}>
                        <Route path="/dashboard" element={<DashboardRouter />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/requests" element={<RequestsPage />} />
                        <Route path="/chat" element={<ChatPage />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
