import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import { symptomApi } from "@/api/symptom.api";
import { aiApi } from "@/api/ai.api";
import { requestApi } from "@/api/request.api";
import { carePlanApi } from "@/api/care_plan.api";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/Card";
import MetricCard from "@/components/MetricCard";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import SymptomTrendChart from "@/components/charts/SymptomTrendChart";
import MedicationHeatmap from "@/components/charts/MedicationHeatmap";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Activity, Brain, Calendar, CheckCircle, Clock, Heart, Moon, Target, Utensils, Zap, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/Button";
import { differenceInDays, format, parseISO } from "date-fns";
import { useStore } from "@/store/useStore";

export default function PatientDashboard() {
    const { user } = useAuth();
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();

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

    const doctors = useQuery({
        queryKey: ["my-doctors"],
        queryFn: () => requestApi.getMyDoctors().then((r) => r.data ?? []),
    });

    const logs = useQuery({
        queryKey: ["symptom-logs-heatmap"],
        queryFn: () => symptomApi.getLogs(28, 0).then((r) => r.data),
    });

    const myTasks = useQuery({
        queryKey: ["my-tasks"],
        queryFn: () => carePlanApi.getMyTasks().then((r) => r.data ?? []),
    });

    const completeMut = useMutation({
        mutationFn: ({ taskId, note }: { taskId: string; note?: string }) =>
            carePlanApi.completeTask(taskId, note),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-tasks"] }); },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const undoMut = useMutation({
        mutationFn: (taskId: string) => carePlanApi.undoTask(taskId),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-tasks"] }); },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const surgeryDay = user?.surgery_date
        ? differenceInDays(new Date(), parseISO(user.surgery_date))
        : null;

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)", boxShadow: "0 8px 32px rgb(79 70 229 / 0.25)" }}>
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", filter: "blur(20px)" }} />
                    <div className="absolute right-2 bottom-0 h-28 w-28 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)", filter: "blur(16px)" }} />
                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">
                                Good {getTimeOfDay()}
                            </p>
                            <h1 className="text-2xl font-extrabold tracking-tight">
                                {user?.name?.split(" ")[0]}
                            </h1>
                            {surgeryDay !== null && (
                                <p className="mt-1 text-sm text-white/60">
                                    Day <span className="font-bold text-white">{surgeryDay}</span> of recovery
                                    {user?.surgery_type && ` — ${user.surgery_type}`}
                                </p>
                            )}
                        </div>
                        <Link to="/log">
                            <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/15 border border-white/20">
                                Log Today
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Recovery stage */}
                {profile.data?.recovery_stage && (
                    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgb(0 0 0 / 0.15)" }}>
                        <div className="absolute right-4 top-4 opacity-10" style={{ fontSize: "64px" }}>🏥</div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Recovery Stage</p>
                        <p className="mt-1.5 text-xl font-bold text-white">{profile.data.recovery_stage.name}</p>
                        <p className="mt-1 text-sm text-white/55">{profile.data.recovery_stage.description}</p>
                    </div>
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
                                label="Doctors"
                                value={doctors.data && doctors.data.length > 0
                                    ? doctors.data.map((d) => d.doctor?.name ?? "?").join(", ")
                                    : "Not linked"}
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
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", boxShadow: "0 4px 12px rgb(124 58 237 / 0.35)" }}>
                            <Brain className="h-4 w-4" />
                        </div>
                        <h2 className="section-heading">AI Insight</h2>
                    </div>
                    {insight.isLoading ? (
                        <Skeleton lines={4} />
                    ) : insight.data ? (
                        <div className="space-y-3 text-sm">
                            <p className="text-gray-700 leading-relaxed">{insight.data.summary}</p>
                            {insight.data.tips.length > 0 && (
                                <div className="rounded-xl bg-blue-50/60 p-3.5">
                                    <p className="text-[12px] font-semibold uppercase tracking-wider text-blue-600 mb-2">Tips</p>
                                    <ul className="space-y-1 text-gray-700">
                                        {insight.data.tips.map((t, i) => (<li key={i} className="flex gap-2"><span className="text-blue-400 shrink-0">•</span>{t}</li>))}
                                    </ul>
                                </div>
                            )}
                            {insight.data.warning_signs.length > 0 && (
                                <div className="rounded-xl bg-red-50/60 p-3.5">
                                    <p className="text-[12px] font-semibold uppercase tracking-wider text-red-600 mb-2">Warning Signs</p>
                                    <ul className="space-y-1 text-red-700">
                                        {insight.data.warning_signs.map((w, i) => (<li key={i} className="flex gap-2"><span className="shrink-0">⚠️</span>{w}</li>))}
                                    </ul>
                                </div>
                            )}
                            <p className="italic text-emerald-600 font-medium">{insight.data.encouragement}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Log symptoms to get AI insights.</p>
                    )}
                </Card>

                {/* Recovery Tasks */}
                {(myTasks.isLoading || (myTasks.data && myTasks.data.length > 0)) && (
                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                                <Target className="h-4 w-4 text-purple-600" />
                            </div>
                            <h2 className="section-heading">My Recovery Tasks</h2>
                            {myTasks.data && (
                                <span className="ml-auto text-xs text-gray-400">
                                    {myTasks.data.filter((t) => t.status === "COMPLETED").length}/{myTasks.data.length} done
                                </span>
                            )}
                        </div>
                        {myTasks.isLoading ? (
                            <Skeleton lines={3} />
                        ) : (
                            <div className="space-y-2">
                                {myTasks.data!.map((t) => (
                                    <div key={t.id}
                                        className={`flex items-start justify-between rounded-xl border p-3 transition-all ${t.status === "COMPLETED"
                                                ? "border-emerald-100 bg-emerald-50/60"
                                                : "border-gray-100 bg-white"
                                            }`}
                                    >
                                        <div className="flex gap-3 min-w-0">
                                            <button
                                                type="button"
                                                disabled={completeMut.isPending || undoMut.isPending}
                                                onClick={() =>
                                                    t.status === "COMPLETED"
                                                        ? undoMut.mutate(t.id)
                                                        : completeMut.mutate({ taskId: t.id })
                                                }
                                                className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                                            >
                                                {t.status === "COMPLETED" ? (
                                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <div className="h-5 w-5 rounded-full border-2 border-gray-300 hover:border-primary-400" />
                                                )}
                                            </button>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-medium ${t.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-900"
                                                    }`}>
                                                    {t.title}
                                                </p>
                                                {t.description && (
                                                    <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                                                )}
                                                <div className="mt-1 flex flex-wrap gap-2">
                                                    {t.frequency && (
                                                        <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                            <Clock className="h-2.5 w-2.5" />{t.frequency}
                                                        </span>
                                                    )}
                                                    {t.due_date && (
                                                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                            <Calendar className="h-2.5 w-2.5" />{format(parseISO(t.due_date), "MMM d")}
                                                        </span>
                                                    )}
                                                    {t.doctor_name && (
                                                        <span className="text-xs text-gray-400">from Dr. {t.doctor_name}</span>
                                                    )}
                                                </div>
                                                {t.completion_note && (
                                                    <p className="mt-1 text-xs text-emerald-600 italic">"{t.completion_note}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

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
