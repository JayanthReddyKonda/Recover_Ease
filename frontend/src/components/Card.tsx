import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean;
    children: ReactNode;
}

export default function Card({
    hoverable = false,
    className,
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={cn(hoverable ? "card-hover" : "card", className)}
            {...props}
        >
            {children}
        </div>
    );
}
