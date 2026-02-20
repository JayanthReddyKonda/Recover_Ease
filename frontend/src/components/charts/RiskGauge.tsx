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
    /** Count of escalations by severity */
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
        <ResponsiveContainer width="100%" height={240}>
            <PieChart>
                <Pie
                    data={data}
                    dataKey="count"
                    nameKey="severity"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    label={({ severity, count }) => `${severity}: ${count}`}
                    style={{ fontSize: "0.7rem" }}
                >
                    {data.map((entry) => (
                        <Cell key={entry.severity} fill={COLORS[entry.severity]} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
            </PieChart>
        </ResponsiveContainer>
    );
}
