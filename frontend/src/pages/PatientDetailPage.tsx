import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import { aiApi } from "@/api/ai.api";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import SymptomTrendChart from "@/components/charts/SymptomTrendChart";
import RiskGauge from "@/components/charts/RiskGauge";
import MedicationHeatmap from "@/components/charts/MedicationHeatmap";
import { useState } from "react";
import { ArrowLeft, Brain, ShieldAlert, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { EscalationResponse, ReviewEscalationRequest, Severity, SymptomTrendPoint } from "@/types";

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();
    const [reviewTarget, setReviewTarget] = useState<EscalationResponse | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");

    const full = useQuery({
        queryKey: ["patient-full", id],
        queryFn: () => patientApi.getFullPatient(id!).then((r) => r.data),
        enabled: !!id,
    });

    const aiSummary = useQuery({
        queryKey: ["doctor-summary", id],
        queryFn: () => aiApi.getDoctorSummary(id!).then((r) => r.data),
        enabled: !!id,
        staleTime: 60_000,
    });

    const reviewMut = useMutation({
        mutationFn: ({ eid, data }: { eid: string; data: ReviewEscalationRequest }) =>
            patientApi.reviewEscalation(eid, data),
        onSuccess: () => {
            addToast("success", "Updated", "Escalation reviewed");
            qc.invalidateQueries({ queryKey: ["patient-full", id] });
            setReviewTarget(null);
            setReviewNotes("");
        },
        onError: (err: Error) => addToast("error", "Failed", err.message),
    });

    if (full.isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const p = full.data;
    if (!p) {
        return (
            <Card className="py-16 text-center">
                <p className="text-gray-500">Patient not found</p>
                <Link to="/patients" className="mt-2 inline-block text-primary-500 hover:underline text-sm">
                    Back to patients
                </Link>
            </Card>
        );
    }

    // Build trend data from logs
    const trendData: SymptomTrendPoint[] = p.logs
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => ({
            date: l.date,
            pain_level: l.pain_level,
            fatigue_level: l.fatigue_level,
            mood: l.mood,
            sleep_hours: l.sleep_hours,
            appetite: l.appetite,
            energy: l.energy,
        }));

    // Escalation severity counts for risk gauge
    const severityCounts = p.escalations.reduce<Record<Severity, number>>(
        (acc, e) => { acc[e.severity] = (acc[e.severity] || 0) + 1; return acc; },
        { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    );
    const riskData = (Object.entries(severityCounts) as [Severity, number][])
        .filter(([, c]) => c > 0)
        .map(([severity, count]) => ({ severity, count }));

    const openEscalations = p.escalations.filter((e) => e.status === "OPEN");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link to="/patients" className="rounded-md p-1 hover:bg-gray-100">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="page-heading">{p.user.name}</h1>
                    <p className="text-sm text-gray-500">
                        {p.user.email}
                        {p.user.surgery_type && ` · ${p.user.surgery_type}`}
                    </p>
                </div>
            </div>

            {/* Recovery stage */}
            {p.recovery_stage && (
                <Card className="bg-gradient-primary text-white">
                    <p className="text-xs uppercase tracking-wider opacity-80">Stage</p>
                    <p className="text-lg font-bold">{p.recovery_stage.name}</p>
                    <p className="text-sm opacity-90">{p.recovery_stage.description}</p>
                </Card>
            )}

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <h2 className="section-heading mb-3">Symptom Trend</h2>
                    {trendData.length > 0 ? (
                        <SymptomTrendChart data={trendData} />
                    ) : (
                        <p className="py-8 text-center text-sm text-gray-400">No logs yet</p>
                    )}
                </Card>

                <div className="space-y-6">
                    <Card>
                        <h2 className="section-heading mb-3">Escalation Risk</h2>
                        <RiskGauge data={riskData} />
                    </Card>
                    <Card>
                        <h2 className="section-heading mb-3">Pain Heatmap</h2>
                        <MedicationHeatmap logs={p.logs} days={28} />
                    </Card>
                </div>
            </div>

            {/* AI Summary */}
            <Card>
                <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-primary-500" />
                    <h2 className="section-heading">AI Summary</h2>
                </div>
                {aiSummary.isLoading ? (
                    <Skeleton lines={5} />
                ) : aiSummary.data ? (
                    <div className="space-y-3 text-sm">
                        <p>{aiSummary.data.overview}</p>
                        {aiSummary.data.risk_factors.length > 0 && (
                            <div>
                                <p className="font-medium text-red-600">Risk Factors</p>
                                <ul className="ml-4 list-disc text-red-500">
                                    {aiSummary.data.risk_factors.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        )}
                        {aiSummary.data.recommendations.length > 0 && (
                            <div>
                                <p className="font-medium text-primary-600">Recommendations</p>
                                <ul className="ml-4 list-disc text-gray-600">
                                    {aiSummary.data.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-3">
                            {(["improving", "declining", "stable"] as const).map((k) => (
                                <div key={k}>
                                    <p className="text-xs font-medium capitalize text-gray-500">{k}</p>
                                    {aiSummary.data!.trends[k].length > 0 ? (
                                        <ul className="mt-1 text-xs text-gray-600">{aiSummary.data!.trends[k].map((t, i) => <li key={i}>{t}</li>)}</ul>
                                    ) : (
                                        <p className="text-xs text-gray-300">—</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">Not enough data for AI summary</p>
                )}
            </Card>

            {/* Open Escalations */}
            {openEscalations.length > 0 && (
                <Card>
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldAlert className="h-5 w-5 text-red-500" />
                        <h2 className="section-heading">Open Escalations</h2>
                    </div>
                    <ul className="space-y-2">
                        {openEscalations.map((e) => (
                            <li key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <Badge
                                        variant={e.severity === "CRITICAL" ? "critical" : e.severity === "HIGH" ? "monitor" : "pending"}
                                    >
                                        {e.severity} {e.is_sos && "· SOS"}
                                    </Badge>
                                    <p className="mt-1 text-xs text-gray-400">
                                        {format(parseISO(e.created_at), "MMM d, h:mm a")}
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => setReviewTarget(e)}>
                                    Review
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}

            {/* Milestones */}
            {p.milestones.length > 0 && (
                <Card>
                    <h2 className="section-heading mb-3">Milestones</h2>
                    <div className="flex flex-wrap gap-3">
                        {p.milestones.map((m) => (
                            <Badge key={m.id} variant="normal" className="text-base">
                                {m.icon} {m.title}
                            </Badge>
                        ))}
                    </div>
                </Card>
            )}

            {/* Review escalation modal */}
            <Modal
                open={!!reviewTarget}
                onClose={() => { setReviewTarget(null); setReviewNotes(""); }}
                title="Review Escalation"
            >
                {reviewTarget && (
                    <div className="space-y-4">
                        <Badge
                            variant={reviewTarget.severity === "CRITICAL" ? "critical" : "monitor"}
                        >
                            {reviewTarget.severity}
                        </Badge>
                        {reviewTarget.ai_verdict && (
                            <p className="text-sm text-gray-600">
                                AI: {reviewTarget.ai_verdict.reasoning}
                            </p>
                        )}
                        <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Doctor notes (optional)"
                            className="input-base resize-none"
                            rows={3}
                        />
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    reviewMut.mutate({
                                        eid: reviewTarget.id,
                                        data: { status: "ACKNOWLEDGED", notes: reviewNotes || undefined },
                                    })
                                }
                                loading={reviewMut.isPending}
                            >
                                Acknowledge
                            </Button>
                            <Button
                                onClick={() =>
                                    reviewMut.mutate({
                                        eid: reviewTarget.id,
                                        data: { status: "RESOLVED", notes: reviewNotes || undefined },
                                    })
                                }
                                loading={reviewMut.isPending}
                            >
                                <CheckCircle className="mr-1 h-4 w-4 inline" /> Resolve
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
