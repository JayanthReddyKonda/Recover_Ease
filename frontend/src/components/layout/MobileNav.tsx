import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PenLine,
    Clock,
    User,
    Users,
    UserPlus,
    MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const patientTabs = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/log", icon: PenLine, label: "Log" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/history", icon: Clock, label: "History" },
    { to: "/profile", icon: User, label: "Profile" },
];

const doctorTabs = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/chat", icon: MessageSquare, label: "Chat" },
    { to: "/requests", icon: UserPlus, label: "Requests" },
    { to: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
    const { user } = useAuth();
    const location = useLocation();
    const tabs = user?.role === "DOCTOR" ? doctorTabs : patientTabs;

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden safe-area-bottom" style={{ background: "linear-gradient(to top, #0d1117f8, #111520f0)", backdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="mx-auto flex max-w-lg items-center">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.to;
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={cn(
                                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-all duration-200",
                                isActive ? "text-primary-300" : "text-white/30 active:text-white/60"
                            )}
                        >
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full" style={{ background: "linear-gradient(90deg, #6366f1, #a78bfa)" }} />
                            )}
                            <tab.icon className={cn("h-5 w-5 transition-all", isActive && "scale-110")} />
                            <span>{tab.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
