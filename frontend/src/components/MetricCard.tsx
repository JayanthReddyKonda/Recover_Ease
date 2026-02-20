import type { ReactNode } from "react";
import clsx from "clsx";

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
        <div className={clsx("card flex items-start gap-4", className)}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="metric-label">{label}</p>
                <p className="metric-value flex items-center gap-1">
                    {value}
                    {trend && (
                        <span
                            className={clsx(
                                "text-xs",
                                trend === "up" && "text-emerald-500",
                                trend === "down" && "text-red-500",
                                trend === "flat" && "text-gray-400",
                            )}
                        >
                            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
                        </span>
                    )}
                </p>
                {sub && <p className="text-xs text-gray-400">{sub}</p>}
            </div>
        </div>
    );
}
