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
        <div className={cn("card flex items-start gap-4 transition-all duration-200 hover:shadow-card-hover", className)}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/80 text-primary-600">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="metric-label">{label}</p>
                <p className="metric-value flex items-center gap-1.5">
                    {value}
                    {trend && (
                        <span
                            className={cn(
                                "text-xs font-semibold",
                                trend === "up" && "text-emerald-500",
                                trend === "down" && "text-red-500",
                                trend === "flat" && "text-gray-400",
                            )}
                        >
                            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                        </span>
                    )}
                </p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}
