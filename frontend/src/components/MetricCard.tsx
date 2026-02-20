import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    trend?: "up" | "down" | "flat";
    className?: string;
}

export default function MetricCard({
    icon,
    label,
    value,
    sub,
    trend,
    className,
}: MetricCardProps) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl border border-gray-100/80 bg-white/90 p-5 shadow-card transition-all duration-300 ease-spring hover:shadow-card-hover hover:-translate-y-0.5 hover:border-primary-100/60",
            className
        )}>
            {/* Subtle background gradient */}
            <div className="absolute inset-0 rounded-2xl opacity-40" style={{ background: "radial-gradient(ellipse at top right, rgb(99 102 241 / 0.06) 0%, transparent 70%)" }} />

            <div className="relative flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 4px 12px rgb(79 70 229 / 0.30)" }}>
                    {icon}
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="metric-label">{label}</p>
                    <p className="metric-value mt-0.5 flex items-baseline gap-1.5">
                        {value}
                        {trend && (
                            <span className={cn(
                                "text-xs font-bold",
                                trend === "up" && "text-emerald-500",
                                trend === "down" && "text-red-500",
                                trend === "flat" && "text-gray-400",
                            )}>
                                {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                            </span>
                        )}
                    </p>
                    {sub && <p className="text-xs text-gray-400 mt-1 leading-snug">{sub}</p>}
                </div>
            </div>
        </div>
    );
}
