import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Heart, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useStore } from "@/store/useStore";

const patientLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/log", label: "Log Symptoms" },
    { to: "/history", label: "History" },
    { to: "/milestones", label: "Milestones" },
    { to: "/profile", label: "Profile" },
];

const doctorLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/patients", label: "Patients" },
    { to: "/requests", label: "Requests" },
    { to: "/profile", label: "Profile" },
];

export default function Navbar() {
    const { user, logout: authLogout } = useAuth();
    const storeLogout = useStore((s) => s.logout);
    const connected = useStore((s) => s.connected);
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = user?.role === "DOCTOR" ? doctorLinks : patientLinks;

    function handleLogout() {
        authLogout();
        storeLogout();
        navigate("/login");
    }

    return (
        <nav className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                {/* Logo */}
                <Link to="/dashboard" className="flex items-center gap-2 font-bold text-primary-600">
                    <Heart className="h-5 w-5 fill-primary-500 text-primary-500" />
                    <span className="hidden sm:inline">Recovery Companion</span>
                </Link>

                {/* Desktop links */}
                <div className="hidden items-center gap-1 md:flex">
                    {links.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            className={clsx(
                                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                                location.pathname === l.to
                                    ? "bg-primary-50 text-primary-600"
                                    : "text-gray-600 hover:bg-gray-50",
                            )}
                        >
                            {l.label}
                        </Link>
                    ))}
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                    {/* Connection indicator */}
                    <span
                        title={connected ? "Real-time connected" : "Disconnected"}
                        className={clsx(
                            "h-2 w-2 rounded-full",
                            connected ? "bg-emerald-400" : "bg-gray-300",
                        )}
                    />

                    <span className="hidden text-sm text-gray-500 sm:inline">
                        {user?.name}
                    </span>

                    <button
                        onClick={handleLogout}
                        className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:inline-flex"
                        title="Logout"
                    >
                        <LogOut className="h-4 w-4" />
                    </button>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen((v) => !v)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 md:hidden"
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="border-t border-gray-100 bg-white px-4 py-3 md:hidden">
                    {links.map((l) => (
                        <Link
                            key={l.to}
                            to={l.to}
                            onClick={() => setMobileOpen(false)}
                            className={clsx(
                                "block rounded-md px-3 py-2 text-sm font-medium",
                                location.pathname === l.to
                                    ? "bg-primary-50 text-primary-600"
                                    : "text-gray-600",
                            )}
                        >
                            {l.label}
                        </Link>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" /> Logout
                    </button>
                </div>
            )}
        </nav>
    );
}
