import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import { symptomApi } from "@/api/symptom.api";
import { aiApi } from "@/api/ai.api";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import SymptomTrendChart from "@/components/charts/SymptomTrendChart";
import MedicationHeatmap from "@/components/charts/MedicationHeatmap";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Activity, Brain, Heart, Moon, Utensils, Zap, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/Button";
import { differenceInDays, parseISO } from "date-fns";

export default function PatientDashboard() {
    const { user } = useAuth();

    const profile = useQuery({
        queryKey: ["patient-profile"],
        queryFn: () => patientApi.getMyProfile().then((r) => r.data),
    });

    const trend = useQuery({
        queryKey: ["symptom-trend"],
        queryFn: () => symptomApi.getTrend(14).then((r) => r.data),
    });

    const summary = useQuery({
        queryKey: ["symptom-summary"],
        queryFn: () => symptomApi.getSummary().then((r) => r.data),
    });

    const insight = useQuery({
        queryKey: ["ai-insight"],
        queryFn: () => aiApi.getPatientInsight().then((r) => r.data),
        staleTime: 60_000,
    });

    const doctor = useQuery({
        queryKey: ["my-doctor"],
        queryFn: () => requestApi.getMyDoctor().then((r) => r.data),
    });

    const logs = useQuery({
        queryKey: ["symptom-logs-heatmap"],
        queryFn: () => symptomApi.getLogs(28, 0).then((r) => r.data),
    });

    const surgeryDay = user?.surgery_date
        ? differenceInDays(new Date(), parseISO(user.surgery_date))
        : null;

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="page-heading">
                            Good {getTimeOfDay()}, {user?.name?.split(" ")[0]}
                        </h1>
                        {surgeryDay !== null && (
                            <p className="mt-1 text-sm text-gray-500">
                                Day <span className="font-semibold text-primary-600">{surgeryDay}</span> of recovery
                                {user?.surgery_type && ` — ${user.surgery_type}`}
                            </p>
                        )}
                    </div>
                    <Link to="/log">
                        <Button>Log Today</Button>
                    </Link>
                </div>

                {/* Recovery stage */}
                {profile.data?.recovery_stage && (
                    <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white border-0 shadow-glow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary-200">
                            Recovery Stage
                        </p>
                        <p className="mt-1.5 text-2xl font-bold">{profile.data.recovery_stage.name}</p>
                        <p className="mt-1 text-sm text-primary-100">
                            {profile.data.recovery_stage.description}
                        </p>
                    </Card>
                )}

                {/* Metric cards */}
                {summary.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}><Skeleton lines={3} /></Card>
                        ))}
                    </div>
                ) : summary.data ? (
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StaggerItem>
                            <MetricCard icon={<Activity className="h-5 w-5" />} label="Avg Pain" value={summary.data.avg_pain.toFixed(1)} sub="/10" />
                        </StaggerItem>
                        <StaggerItem>
                            <MetricCard icon={<Heart className="h-5 w-5" />} label="Avg Mood" value={summary.data.avg_mood.toFixed(1)} sub="/10" />
                        </StaggerItem>
                        <StaggerItem>
                            <MetricCard icon={<Zap className="h-5 w-5" />} label="Avg Energy" value={summary.data.avg_energy.toFixed(1)} sub="/10" />
                        </StaggerItem>
                        <StaggerItem>
                            <MetricCard icon={<Moon className="h-5 w-5" />} label="Avg Sleep" value={`${summary.data.avg_sleep.toFixed(1)}h`} />
                        </StaggerItem>
                        <StaggerItem>
                            <MetricCard icon={<Utensils className="h-5 w-5" />} label="Total Logs" value={summary.data.total_logs} />
                        </StaggerItem>
                        <StaggerItem>
                            <MetricCard
                                icon={<UserCheck className="h-5 w-5" />}
                                label="Doctor"
                                value={doctor.data?.name ?? "Not linked"}
                            />
                        </StaggerItem>
                    </Stagger>
                ) : null}

                {/* Trend chart */}
                <Card>
                    <h2 className="section-heading mb-4">14-Day Trend</h2>
                    {trend.isLoading ? (
                        <Skeleton className="h-72 w-full" />
                    ) : trend.data && trend.data.length > 0 ? (
                        <SymptomTrendChart data={trend.data} />
                    ) : (
                        <p className="py-10 text-center text-sm text-gray-400">
                            No trend data yet — log your first symptoms!
                        </p>
                    )}
                </Card>

                {/* Pain heatmap */}
                <Card>
                    <h2 className="section-heading mb-4">Pain Heatmap (28 days)</h2>
                    {logs.data ? (
                        <MedicationHeatmap logs={logs.data} days={28} />
                    ) : (
                        <Skeleton className="h-20 w-full" />
                    )}
                </Card>

                {/* AI Insight */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-400 text-white">
                            <Brain className="h-4 w-4" />
                        </div>
                        <h2 className="section-heading">AI Insight</h2>
                    </div>
                    {insight.isLoading ? (
                        <Skeleton lines={4} />
                    ) : insight.data ? (
                        <div className="space-y-3 text-sm">
                            <p>{insight.data.summary}</p>
                            {insight.data.tips.length > 0 && (
                                <div>
                                    <p className="font-medium text-gray-700">Tips</p>
                                    <ul className="ml-4 list-disc text-gray-600">
                                        {insight.data.tips.map((t, i) => (<li key={i}>{t}</li>))}
                                    </ul>
                                </div>
                            )}
                            {insight.data.warning_signs.length > 0 && (
                                <div>
                                    <p className="font-medium text-red-600">Warning Signs</p>
                                    <ul className="ml-4 list-disc text-red-500">
                                        {insight.data.warning_signs.map((w, i) => (<li key={i}>{w}</li>))}
                                    </ul>
                                </div>
                            )}
                            <p className="italic text-emerald-600">{insight.data.encouragement}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Log symptoms to get AI insights.</p>
                    )}
                </Card>

                {/* Milestones preview */}
                {profile.data?.milestones && profile.data.milestones.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="section-heading">Milestones</h2>
                            <Link to="/milestones" className="text-xs text-primary-500 hover:underline">
                                View all
                            </Link>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {profile.data.milestones.slice(0, 6).map((m) => (
                                <Badge key={m.id} variant="normal" className="text-base">
                                    {m.icon} {m.title}
                                </Badge>
                            ))}
                        </div>
                    </Card>
                )}
            </div>
        </PageTransition>
    );
}

function getTimeOfDay() {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
}
