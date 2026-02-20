import clsx from "clsx";

interface SkeletonProps {
    className?: string;
    lines?: number;
}

export default function Skeleton({ className, lines = 1 }: SkeletonProps) {
    if (lines > 1) {
        return (
            <div className="flex flex-col gap-2">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={clsx(
                            "animate-pulse rounded-md bg-gray-200",
                            i === lines - 1 ? "h-3 w-3/4" : "h-3 w-full",
                            className,
                        )}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={clsx("animate-pulse rounded-md bg-gray-200 h-4", className)}
        />
    );
}
