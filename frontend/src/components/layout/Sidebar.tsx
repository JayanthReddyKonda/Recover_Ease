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
    Settings,
    MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";

/* ─── Navigation configs ──────────────────────────── */
const patientNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/log", label: "Log Symptoms", icon: PenLine },
    { to: "/history", label: "History", icon: Clock },
    { to: "/milestones", label: "Milestones", icon: Trophy },
    { to: "/chat", label: "Chat", icon: MessageSquare },
    { to: "/requests", label: "Connections", icon: UserPlus },
];

const doctorNav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/patients", label: "Patients", icon: Users },
    { to: "/chat", label: "Chat", icon: MessageSquare },
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
    const initials = user?.name
        ? user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
        : "?";

    function handleLogout() {
        authLogout();
        storeLogout();
        navigate("/login");
    }

    return (
        <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col z-30 sidebar-bg">
            {/* ── Logo ──── */}
            <div className="flex h-16 shrink-0 items-center gap-3 px-5 border-b border-white/[0.06]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl shadow-glow-sm" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                    <Heart className="h-[18px] w-[18px] fill-white text-white" />
                </div>
                <div className="leading-none">
                    <span className="block text-[15px] font-bold text-white tracking-tight">RecoverEase</span>
                </div>
                <div className="ml-auto">
                    <div
                        className={cn(
                            "h-2 w-2 rounded-full transition-all duration-500",
                            connected ? "bg-emerald-400 shadow-glow-green" : "bg-white/20"
                        )}
                        title={connected ? "Live" : "Offline"}
                    />
                </div>
            </div>

            {/* ── Navigation ──── */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {nav.map((item) => {
                    const isActive =
                        location.pathname === item.to ||
                        (item.to !== "/dashboard" && location.pathname.startsWith(item.to + "/"));
                    return (
                        <Link key={item.to} to={item.to}>
                            <motion.div
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ duration: 0.15, ease: "easeOut" }}
                                className={cn(
                                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 overflow-hidden",
                                    isActive
                                        ? "text-white"
                                        : "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 rounded-xl"
                                        style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.4) 0%, rgba(79,70,229,0.25) 100%)" }}
                                        transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
                                    />
                                )}
                                <item.icon
                                    className={cn(
                                        "h-[18px] w-[18px] shrink-0 relative z-10",
                                        isActive ? "text-primary-300" : "text-white/35"
                                    )}
                                />
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto relative z-10 h-1.5 w-1.5 rounded-full bg-primary-400" />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}

                {/* ── SOS ──── */}
                {user?.role === "PATIENT" && (
                    <div className="pt-3 mt-3 border-t border-white/[0.06]">
                        <Link to="/sos">
                            <motion.div
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ duration: 0.15 }}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                                    location.pathname === "/sos"
                                        ? "bg-red-500/20 text-red-300"
                                        : "text-red-400/60 hover:bg-red-500/10 hover:text-red-300"
                                )}
                            >
                                <AlertTriangle className="h-[18px] w-[18px] shrink-0" />
                                SOS Emergency
                                <span className="ml-auto flex h-2 w-2 rounded-full bg-red-500 animate-pulse-soft" />
                            </motion.div>
                        </Link>
                    </div>
                )}
            </nav>

            {/* ── Bottom: Profile + Logout ──── */}
            <div className="shrink-0 border-t border-white/[0.06] p-3 space-y-1">
                <Link to="/profile">
                    <motion.div
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200",
                            location.pathname === "/profile"
                                ? "bg-white/10 text-white"
                                : "text-white/50 hover:bg-white/[0.06] hover:text-white/80"
                        )}
                    >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}>
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate text-white/80 leading-none">{user?.name}</p>
                            <p className="text-[10px] text-white/30 truncate mt-0.5 capitalize">{user?.role?.toLowerCase()}</p>
                        </div>
                        <Settings className="h-3.5 w-3.5 text-white/25 shrink-0" />
                    </motion.div>
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-white/35 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
                >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
