import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Heart,
    LayoutDashboard,
    PenLine,
    Clock,
    Trophy,
    Users,
    UserPlus,
    AlertTriangle,
    LogOut,
    User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";

/* ─── Navigation configs ──────────────────────────── */
const patientNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/log", label: "Log Symptoms", icon: PenLine },
    { to: "/history", label: "History", icon: Clock },
    { to: "/milestones", label: "Milestones", icon: Trophy },
    { to: "/requests", label: "Connections", icon: UserPlus },
];

const doctorNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/requests", label: "Requests", icon: UserPlus },
];

/* ─── Sidebar component ──────────────────────────── */
export default function Sidebar() {
    const { user, logout: authLogout } = useAuth();
    const storeLogout = useStore((s) => s.logout);
    const connected = useStore((s) => s.connected);
    const location = useLocation();
    const navigate = useNavigate();

    const nav = user?.role === "DOCTOR" ? doctorNav : patientNav;

    function handleLogout() {
        authLogout();
        storeLogout();
        navigate("/login");
    }

    return (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col border-r border-gray-200/60 bg-white z-30">
            {/* ── Logo ──── */}
            <div className="flex h-16 shrink-0 items-center gap-3 px-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white shadow-glow-sm">
                    <Heart className="h-4 w-4 fill-current" />
                </div>
                <span className="text-[15px] font-bold text-gray-900">
                    Recovery
                </span>
            </div>

            {/* ── Navigation ──── */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pt-2">
                {nav.map((item) => {
                    const isActive =
                        location.pathname === item.to ||
                        (item.to !== "/dashboard" &&
                            location.pathname.startsWith(item.to + "/"));
                    return (
                        <Link key={item.to} to={item.to}>
                            <motion.div
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                                    isActive
                                        ? "bg-primary-50 text-primary-700"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "h-[18px] w-[18px] shrink-0",
                                        isActive
                                            ? "text-primary-600"
                                            : "text-gray-400",
                                    )}
                                />
                                {item.label}
                            </motion.div>
                        </Link>
                    );
                })}

                {/* ── SOS (patient only) ──── */}
                {user?.role === "PATIENT" && (
                    <Link to="/sos" className="block pt-3 mt-3 border-t border-gray-100">
                        <div
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                                location.pathname === "/sos"
                                    ? "bg-red-50 text-red-700"
                                    : "text-red-500 hover:bg-red-50",
                            )}
                        >
                            <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
                            SOS Emergency
                        </div>
                    </Link>
                )}
            </nav>

            {/* ── Bottom: Profile + Logout ──── */}
            <div className="shrink-0 border-t border-gray-100 p-3 space-y-1">
                <Link to="/profile">
                    <div
                        className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                            location.pathname === "/profile"
                                ? "bg-primary-50"
                                : "hover:bg-gray-50",
                        )}
                    >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-[13px] font-semibold text-gray-900">
                                {user?.name}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span
                                    className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        connected
                                            ? "bg-emerald-400"
                                            : "bg-gray-300",
                                    )}
                                />
                                <span className="truncate text-[11px] text-gray-400">
                                    {connected ? "Connected" : "Offline"}
                                </span>
                            </div>
                        </div>
                    </div>
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                >
                    <LogOut className="h-[18px] w-[18px]" />
                    Log out
                </button>
            </div>
        </aside>
    );
}
