import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from "recharts";
import type { Severity } from "@/types";

interface Props {
    data: { severity: Severity; count: number }[];
}

const COLORS: Record<Severity, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
};

export default function RiskGauge({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                No escalation data
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    label={({ severity, count }) => `${severity}: ${count}`}
                    style={{ fontSize: "0.65rem" }}
                    strokeWidth={0}
                >
                    {data.map((entry) => (
                        <Cell key={entry.severity} fill={COLORS[entry.severity]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        borderRadius: "0.75rem",
                        border: "1px solid #e5e7eb",
                        fontSize: "0.75rem",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    }}
                />
                <Legend
                    wrapperStyle={{ fontSize: "0.7rem" }}
                    iconType="circle"
                    iconSize={6}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
