import type { SymptomLogResponse } from "@/types";
import { format, parseISO, subDays, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
    logs: SymptomLogResponse[];
    /** Number of past days to display */
    days?: number;
}

/**
 * Heatmap grid showing daily pain level over the past N days.
 * Darker cells = higher pain.
 */
export default function MedicationHeatmap({ logs, days = 28 }: Props) {
    const today = new Date();
    const start = subDays(today, days - 1);
    const allDays = eachDayOfInterval({ start, end: today });

    // Index logs by date string
    const byDate = new Map<string, number>();
    logs.forEach((l) => {
        const key = format(parseISO(l.date ?? l.created_at), "yyyy-MM-dd");
        byDate.set(key, l.pain_level);
    });

    function colorForPain(pain: number | undefined): string {
        if (pain === undefined) return "bg-gray-100";
        if (pain <= 2) return "bg-emerald-200";
        if (pain <= 4) return "bg-emerald-400";
        if (pain <= 6) return "bg-amber-300";
        if (pain <= 8) return "bg-orange-400";
        return "bg-red-500";
    }

    return (
        <div>
            <div className="flex flex-wrap gap-1">
                {allDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const pain = byDate.get(key);
                    return (
                        <div
                            key={key}
                            title={`${format(d, "MMM d")} – Pain: ${pain ?? "No log"}`}
                            className={cn(
                                "h-5 w-5 rounded-sm transition-colors",
                                colorForPain(pain),
                            )}
                        />
                    );
                })}
            </div>
            {/* Legend */}
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>Less</span>
                {["bg-gray-100", "bg-emerald-200", "bg-emerald-400", "bg-amber-300", "bg-orange-400", "bg-red-500"].map(
                    (c) => (
                        <div key={c} className={cn("h-3 w-3 rounded-sm", c)} />
                    ),
                )}
                <span>More pain</span>
            </div>
        </div>
    );
}
