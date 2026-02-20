import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

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
            className={clsx(hoverable ? "card-hover" : "card", className)}
            {...props}
        >
            {children}
        </div>
    );
}
