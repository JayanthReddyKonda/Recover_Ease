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
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formatted} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={{ stroke: "#f1f5f9" }}
                    tickLine={false}
                />
                <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        padding: "8px 12px",
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: "0.7rem", paddingTop: "8px" }}
                    iconType="circle"
                    iconSize={6}
                />
                {LINES.map((l) => (
                    <Line
                        key={l.key}
                        type="monotone"
                        dataKey={l.key}
                        stroke={l.color}
                        name={l.label}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 3.5, strokeWidth: 2, fill: "#fff" }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
