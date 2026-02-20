import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    PenLine,
    Clock,
    Trophy,
    User,
    Users,
    UserPlus,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const patientTabs = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/log", icon: PenLine, label: "Log" },
    { to: "/history", icon: Clock, label: "History" },
    { to: "/milestones", icon: Trophy, label: "Awards" },
    { to: "/profile", icon: User, label: "Profile" },
];

const doctorTabs = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { to: "/patients", icon: Users, label: "Patients" },
    { to: "/requests", icon: UserPlus, label: "Requests" },
    { to: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
    const { user } = useAuth();
    const location = useLocation();
    const tabs = user?.role === "DOCTOR" ? doctorTabs : patientTabs;

    return (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200/60 bg-white/90 backdrop-blur-xl lg:hidden safe-area-bottom">
            <div className="mx-auto flex max-w-lg items-center justify-around">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.to;
                    return (
                        <Link
                            key={tab.to}
                            to={tab.to}
                            className={cn(
                                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                                isActive
                                    ? "text-primary-600"
                                    : "text-gray-400 active:text-gray-600",
                            )}
                        >
                            <tab.icon
                                className={cn(
                                    "h-5 w-5 transition-colors",
                                    isActive && "text-primary-600",
                                )}
                            />
                            <span>{tab.label}</span>
                            {isActive && (
                                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary-600" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
