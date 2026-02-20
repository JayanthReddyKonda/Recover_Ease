import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeVariant =
    | "critical"
    | "monitor"
    | "recovering"
    | "normal"
    | "pending"
    | "default";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

export default function Badge({
    variant = "default",
    className,
    children,
    ...props
}: BadgeProps) {
    return (
        <span
            className={cn(
                "badge",
                variant !== "default" && `badge-${variant}`,
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
