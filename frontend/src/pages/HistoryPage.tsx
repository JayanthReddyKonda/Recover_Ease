import { useQuery } from "@tanstack/react-query";
import { symptomApi } from "@/api/symptom.api";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import SymptomTrendChart from "@/components/charts/SymptomTrendChart";
import { PageTransition } from "@/components/motion";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import Button from "@/components/Button";

export default function HistoryPage() {
    const [days, setDays] = useState(14);

    const logs = useQuery({
        queryKey: ["symptom-logs", 50],
        queryFn: () => symptomApi.getLogs(50, 0).then((r) => r.data),
    });

    const trend = useQuery({
        queryKey: ["symptom-trend", days],
        queryFn: () => symptomApi.getTrend(days).then((r) => r.data),
    });

    return (
        <PageTransition>
            <div className="space-y-6">
                <h1 className="page-heading">Symptom History</h1>

                {/* Trend chart */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-heading">Trend</h2>
                        <div className="flex gap-1">
                            {[7, 14, 30].map((d) => (
                                <Button
                                    key={d}
                                    size="sm"
                                    variant={days === d ? "primary" : "ghost"}
                                    onClick={() => setDays(d)}
                                >
                                    {d}d
                                </Button>
                            ))}
                        </div>
                    </div>
                    {trend.isLoading ? (
                        <Skeleton className="h-72 w-full" />
                    ) : trend.data && trend.data.length > 0 ? (
                        <SymptomTrendChart data={trend.data} />
                    ) : (
                        <p className="py-10 text-center text-sm text-gray-400">No data yet</p>
                    )}
                </Card>

                {/* Log list */}
                <Card>
                    <h2 className="section-heading mb-4">All Logs</h2>
                    {logs.isLoading ? (
                        <Skeleton lines={8} />
                    ) : logs.data && logs.data.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {logs.data.map((log) => (
                                <div key={log.id} className="py-3.5 first:pt-0 last:pb-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-900">
                                            {format(parseISO(log.date ?? log.created_at), "MMM d, yyyy")}
                                        </p>
                                        <div className="flex gap-1.5">
                                            <Badge variant={log.pain_level >= 7 ? "critical" : log.pain_level >= 4 ? "monitor" : "normal"}>
                                                Pain {log.pain_level}
                                            </Badge>
                                            <Badge variant="recovering">Mood {log.mood}</Badge>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                        <span>Energy: {log.energy}/10</span>
                                        <span>Fatigue: {log.fatigue_level}/10</span>
                                        <span>Sleep: {log.sleep_hours}h</span>
                                        <span>Appetite: {log.appetite}/10</span>
                                        {log.temperature && <span>Temp: {log.temperature}°F</span>}
                                    </div>
                                    {log.notes && (
                                        <p className="mt-1.5 text-xs text-gray-400 italic">&quot;{log.notes}&quot;</p>
                                    )}
                                    {log.ai_insight && (
                                        <p className="mt-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700">{log.ai_insight.summary}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-gray-400">No logs recorded yet</p>
                    )}
                </Card>
            </div>
        </PageTransition>
    );
}
