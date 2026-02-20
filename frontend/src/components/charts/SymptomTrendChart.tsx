import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
} from "recharts";
import type { SymptomTrendPoint } from "@/types";
import { format, parseISO } from "date-fns";

interface Props {
    data: SymptomTrendPoint[];
}

const LINES: { key: keyof Omit<SymptomTrendPoint, "date">; color: string; label: string }[] = [
    { key: "pain_level", color: "#ef4444", label: "Pain" },
    { key: "mood", color: "#22c55e", label: "Mood" },
    { key: "energy", color: "#3b82f6", label: "Energy" },
    { key: "sleep_hours", color: "#a855f7", label: "Sleep (h)" },
    { key: "fatigue_level", color: "#f97316", label: "Fatigue" },
    { key: "appetite", color: "#14b8a6", label: "Appetite" },
];

export default function SymptomTrendChart({ data }: Props) {
    const formatted = data.map((d) => ({
        ...d,
        dateLabel: format(parseISO(d.date), "MMM d"),
    }));

    return (
        <ResponsiveContainer width="100%" height={320}>
            <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                <Tooltip
                    contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.75rem",
                    }}
                />
                <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
                {LINES.map((l) => (
                    <Line
                        key={l.key}
                        type="monotone"
                        dataKey={l.key}
                        stroke={l.color}
                        name={l.label}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
