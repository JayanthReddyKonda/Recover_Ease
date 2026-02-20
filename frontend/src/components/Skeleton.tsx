import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
    lines?: number;
}

export default function Skeleton({ className, lines = 1 }: SkeletonProps) {
    if (lines > 1) {
        return (
            <div className="flex flex-col gap-2.5">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className={cn(
                            "h-3 rounded-md bg-gray-100 shimmer",
                            i === lines - 1 ? "w-3/5" : "w-full",
                            className,
                        )}
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={cn("h-4 rounded-md bg-gray-100 shimmer", className)}
        />
    );
}
