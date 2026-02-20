import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import { aiApi } from "@/api/ai.api";
import { carePlanApi } from "@/api/care_plan.api";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Modal from "@/components/Modal";
import SymptomTrendChart from "@/components/charts/SymptomTrendChart";
import RiskGauge from "@/components/charts/RiskGauge";
import MedicationHeatmap from "@/components/charts/MedicationHeatmap";
import { PageTransition } from "@/components/motion";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft, Brain, ShieldAlert, CheckCircle,
    Pill, Calendar, Clock, Plus, Trash2, Edit2,
    ClipboardList, Target, CheckSquare, Square, Stethoscope,
    Timer,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type {
    CarePlan,
    CreateTaskBody,
    EscalationResponse,
    MedicationInput,
    RecoveryTask,
    ReviewEscalationRequest,
    Severity,
    SymptomTrendPoint,
    UpdateCarePlanBody,
    UpdateTaskBody,
} from "@/types";

// ── empty medication helper ───────────────────────────
const emptyMed = (): MedicationInput => ({
    name: "", dosage: "", frequency: "", time_of_day: "", instructions: "",
});

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();

    // ── Escalation review state ──────────────────────
    const [reviewTarget, setReviewTarget] = useState<EscalationResponse | null>(null);
    const [reviewNotes, setReviewNotes] = useState("");

    // ── Care plan edit state ─────────────────────────
    const [showCarePlanModal, setShowCarePlanModal] = useState(false);
    const [cpMeds, setCpMeds] = useState<MedicationInput[]>([emptyMed()]);
    const [cpRecoveryDate, setCpRecoveryDate] = useState("");
    const [cpDuration, setCpDuration] = useState("");
    const [cpNotes, setCpNotes] = useState("");

    // ── Surgery details state ────────────────────────
    const [showSurgeryModal, setShowSurgeryModal] = useState(false);
    const [surgeryType, setSurgeryType] = useState("");
    const [surgeryDate, setSurgeryDate] = useState("");

    // ── Task state ───────────────────────────────────
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editTask, setEditTask] = useState<RecoveryTask | null>(null);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDesc, setTaskDesc] = useState("");
    const [taskFreq, setTaskFreq] = useState("");
    const [taskDue, setTaskDue] = useState("");

    // ── Queries ──────────────────────────────────────
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

    const carePlan = useQuery({
        queryKey: ["care-plan", id],
        queryFn: () => carePlanApi.getCarePlan(id!).then((r) => r.data),
        enabled: !!id,
    });

    const tasks = useQuery({
        queryKey: ["doctor-tasks", id],
        queryFn: () => carePlanApi.listDoctorTasks(id!).then((r) => r.data ?? []),
        enabled: !!id,
    });

    // ── Mutations ─────────────────────────────────────
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

    const updateCarePlanMut = useMutation({
        mutationFn: (body: UpdateCarePlanBody) => carePlanApi.updateCarePlan(id!, body),
        onSuccess: () => {
            addToast("success", "Updated", "Care plan saved");
            qc.invalidateQueries({ queryKey: ["care-plan", id] });
            setShowCarePlanModal(false);
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const createTaskMut = useMutation({
        mutationFn: (body: CreateTaskBody) => carePlanApi.createTask(id!, body),
        onSuccess: () => {
            addToast("success", "Task added", taskTitle);
            qc.invalidateQueries({ queryKey: ["doctor-tasks", id] });
            setShowTaskModal(false);
            resetTaskForm();
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const updateTaskMut = useMutation({
        mutationFn: ({ tid, body }: { tid: string; body: UpdateTaskBody }) =>
            carePlanApi.updateTask(id!, tid, body),
        onSuccess: () => {
            addToast("success", "Task updated", "");
            qc.invalidateQueries({ queryKey: ["doctor-tasks", id] });
            setShowTaskModal(false);
            setEditTask(null);
            resetTaskForm();
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const deleteTaskMut = useMutation({
        mutationFn: (tid: string) => carePlanApi.deleteTask(id!, tid),
        onSuccess: () => {
            addToast("info", "Deleted", "Task removed");
            qc.invalidateQueries({ queryKey: ["doctor-tasks", id] });
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const updateSurgeryMut = useMutation({
        mutationFn: ({ type, date }: { type: string; date: string }) =>
            patientApi.updateSurgeryDetails(id!, type, date),
        onSuccess: () => {
            addToast("success", "Saved", "Surgery details updated");
            qc.invalidateQueries({ queryKey: ["patient-full", id] });
            setShowSurgeryModal(false);
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    // ── Helpers ──────────────────────────────────────
    const resetTaskForm = () => { setTaskTitle(""); setTaskDesc(""); setTaskFreq(""); setTaskDue(""); };

    const openCarePlanModal = (plan: CarePlan | null | undefined) => {
        setCpMeds((plan?.medications as MedicationInput[] | null) ?? [emptyMed()]);
        setCpRecoveryDate(plan?.expected_recovery_date ? plan.expected_recovery_date.split("T")[0] : "");
        setCpDuration(plan?.recovery_duration ?? "");
        setCpNotes(plan?.care_notes ?? "");
        setShowCarePlanModal(true);
    };

    const openCreateTask = () => {
        setEditTask(null);
        resetTaskForm();
        setShowTaskModal(true);
    };

    const openEditTask = (t: RecoveryTask) => {
        setEditTask(t);
        setTaskTitle(t.title);
        setTaskDesc(t.description ?? "");
        setTaskFreq(t.frequency ?? "");
        setTaskDue(t.due_date ? t.due_date.split("T")[0] : "");
        setShowTaskModal(true);
    };

    const updateMed = (i: number, field: keyof MedicationInput, value: string) => {
        setCpMeds((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: value };
            return next;
        });
    };

    // ── Loading state ─────────────────────────────────
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
    const plan = carePlan.data;
    const taskList = tasks.data ?? [];
    const activeTasks = taskList.filter((t) => t.is_active);

    return (
        <PageTransition>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link to="/patients" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600 font-bold text-lg">
                        {p.user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h1 className="page-heading truncate">{p.user.name}</h1>
                        <p className="text-sm text-gray-500">
                            {p.user.email}
                            {p.user.surgery_type && <span className="text-gray-300"> · </span>}
                            {p.user.surgery_type && <span>{p.user.surgery_type}</span>}
                        </p>
                    </div>
                </div>

                {/* Recovery stage */}
                {p.recovery_stage && (
                    <Card className="border-0 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-glow-sm">
                        <p className="text-xs uppercase tracking-wider text-primary-200">Stage</p>
                        <p className="text-lg font-bold">{p.recovery_stage.name}</p>
                        <p className="text-sm text-primary-100">{p.recovery_stage.description}</p>
                    </Card>
                )}

                {/* Surgery Details Card (doctor-editable) */}
                <Card>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="section-heading flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-primary-500" /> Surgery Details
                        </h2>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setSurgeryType(p.user.surgery_type ?? "");
                                setSurgeryDate(p.user.surgery_date ? p.user.surgery_date.split("T")[0] : "");
                                setShowSurgeryModal(true);
                            }}
                        >
                            <Edit2 className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Surgery Type</p>
                            <p className="text-sm font-medium text-gray-800">{p.user.surgery_type || <span className="text-gray-400 italic">Not set</span>}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Surgery Date</p>
                            <p className="text-sm font-medium text-gray-800">
                                {p.user.surgery_date
                                    ? format(parseISO(p.user.surgery_date), "dd MMM yyyy")
                                    : <span className="text-gray-400 italic">Not set</span>}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* ── Care Plan Row ─────────────────────────────── */}
                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Prescription / Medications */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="section-heading flex items-center gap-2">
                                <Pill className="h-4 w-4 text-primary-500" /> Prescription
                            </h2>
                            <Button size="sm" variant="outline" onClick={() => openCarePlanModal(plan)}>
                                <Edit2 className="mr-1 h-3.5 w-3.5" /> Update
                            </Button>
                        </div>
                        {carePlan.isLoading ? (
                            <Skeleton lines={3} />
                        ) : plan?.medications && (plan.medications as MedicationInput[]).length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50 text-gray-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Medication</th>
                                            <th className="px-3 py-2 text-left">Dosage</th>
                                            <th className="px-3 py-2 text-left">Schedule</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {(plan.medications as MedicationInput[]).map((m, i) => (
                                            <tr key={i}>
                                                <td className="px-3 py-2 font-medium text-gray-900">{m.name}</td>
                                                <td className="px-3 py-2 text-gray-600">{m.dosage}</td>
                                                <td className="px-3 py-2 text-gray-500">{m.frequency} · {m.time_of_day}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center">
                                <Pill className="mx-auto mb-1 h-6 w-6 text-gray-300" />
                                <p className="text-xs text-gray-400">No prescription set</p>
                                <button type="button" onClick={() => openCarePlanModal(plan)}
                                    className="mt-1 text-xs text-primary-500 hover:underline">
                                    Add prescription
                                </button>
                            </div>
                        )}
                        {plan?.care_notes && (
                            <p className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                                📝 {plan.care_notes}
                            </p>
                        )}
                    </Card>

                    {/* Recovery Timeline */}
                    <Card>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="section-heading flex items-center gap-2">
                                <Timer className="h-4 w-4 text-emerald-500" /> Recovery Timeline
                            </h2>
                            <Button size="sm" variant="outline" onClick={() => openCarePlanModal(plan)}>
                                <Edit2 className="mr-1 h-3.5 w-3.5" /> Set
                            </Button>
                        </div>
                        {carePlan.isLoading ? (
                            <Skeleton lines={2} />
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                    <Calendar className="h-5 w-5 text-emerald-600 shrink-0" />
                                    <div>
                                        <p className="text-xs text-emerald-700 font-medium">Expected Recovery Date</p>
                                        <p className="text-sm font-semibold text-emerald-900">
                                            {plan?.expected_recovery_date
                                                ? format(parseISO(plan.expected_recovery_date), "MMMM d, yyyy")
                                                : <span className="text-gray-400 font-normal">Not set</span>
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                                    <Clock className="h-5 w-5 text-blue-600 shrink-0" />
                                    <div>
                                        <p className="text-xs text-blue-700 font-medium">Recovery Duration</p>
                                        <p className="text-sm font-semibold text-blue-900">
                                            {plan?.recovery_duration ?? <span className="text-gray-400 font-normal">Not set</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                {/* ── Recovery Tasks ───────────────────────────── */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-heading flex items-center gap-2">
                            <Target className="h-4 w-4 text-purple-500" /> Recovery Tasks
                        </h2>
                        <Button size="sm" onClick={openCreateTask}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Task
                        </Button>
                    </div>
                    {tasks.isLoading ? (
                        <Skeleton lines={4} />
                    ) : taskList.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
                            <ClipboardList className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                            <p className="text-sm text-gray-400">No recovery tasks yet</p>
                            <button type="button" onClick={openCreateTask}
                                className="mt-1 text-xs text-primary-500 hover:underline">
                                Assign first task
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {taskList.map((t) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex items-start justify-between rounded-xl border p-3 transition-all ${t.status === "COMPLETED"
                                        ? "border-emerald-100 bg-emerald-50/60 opacity-75"
                                        : !t.is_active
                                            ? "border-gray-100 bg-gray-50 opacity-60"
                                            : "border-gray-100 bg-white"
                                        }`}
                                >
                                    <div className="flex gap-3 min-w-0">
                                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.status === "COMPLETED" ? "bg-emerald-100" : "bg-gray-100"
                                            }`}>
                                            {t.status === "COMPLETED"
                                                ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                                : <Target className="h-3.5 w-3.5 text-gray-400" />
                                            }
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-sm font-medium ${t.status === "COMPLETED" ? "line-through text-gray-400" : "text-gray-900"}`}>
                                                {t.title}
                                            </p>
                                            {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
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
                                                {!t.is_active && <Badge variant="pending">Deactivated</Badge>}
                                            </div>
                                            {t.completion_note && (
                                                <p className="mt-1 text-xs text-emerald-600 italic">"{t.completion_note}"</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 ml-2 shrink-0">
                                        <button type="button" onClick={() => openEditTask(t)}
                                            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button type="button" onClick={() => deleteTaskMut.mutate(t.id)}
                                            className="rounded-md p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                    {activeTasks.length > 0 && (
                        <p className="mt-2 text-xs text-gray-400 text-right">
                            {activeTasks.filter((t) => t.status === "COMPLETED").length}/{activeTasks.length} completed
                        </p>
                    )}
                </Card>

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
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                            <Brain className="h-4 w-4 text-purple-600" />
                        </div>
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
                                <li key={e.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
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

                {/* ── Care Plan Modal ───────────────────────────── */}
                <Modal
                    open={showCarePlanModal}
                    onClose={() => setShowCarePlanModal(false)}
                    title="Update Care Plan"
                >
                    <div className="space-y-5">
                        {/* Recovery date + duration */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="label-sm flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Expected Recovery Date
                                </label>
                                <Input type="date" value={cpRecoveryDate}
                                    onChange={(e) => setCpRecoveryDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="label-sm flex items-center gap-1">
                                    <Timer className="h-3 w-3" /> Recovery Duration
                                </label>
                                <Input placeholder="e.g. 6 weeks, 3 months" value={cpDuration}
                                    onChange={(e) => setCpDuration(e.target.value)} />
                            </div>
                        </div>

                        {/* Medications */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="label-sm flex items-center gap-1">
                                    <Pill className="h-3 w-3" /> Medications
                                </label>
                                <button type="button"
                                    onClick={() => setCpMeds((p) => [...p, emptyMed()])}
                                    className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs text-primary-700 hover:bg-primary-100 transition-colors">
                                    <Plus className="h-3 w-3" /> Add
                                </button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                <AnimatePresence>
                                    {cpMeds.map((med, i) => (
                                        <motion.div key={i}
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500">Medicine #{i + 1}</span>
                                                {cpMeds.length > 1 && (
                                                    <button type="button"
                                                        onClick={() => setCpMeds((p) => p.filter((_, idx) => idx !== i))}
                                                        className="text-red-400 hover:text-red-600">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input placeholder="Name" value={med.name}
                                                    onChange={(e) => updateMed(i, "name", e.target.value)} />
                                                <Input placeholder="Dosage (e.g. 500mg)" value={med.dosage}
                                                    onChange={(e) => updateMed(i, "dosage", e.target.value)} />
                                                <Input placeholder="Frequency" value={med.frequency}
                                                    onChange={(e) => updateMed(i, "frequency", e.target.value)} />
                                                <Input placeholder="Time of day" value={med.time_of_day}
                                                    onChange={(e) => updateMed(i, "time_of_day", e.target.value)} />
                                                <Input placeholder="Instructions" value={med.instructions}
                                                    onChange={(e) => updateMed(i, "instructions", e.target.value)}
                                                    className="col-span-2" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="label-sm">Care Notes</label>
                            <textarea
                                value={cpNotes}
                                onChange={(e) => setCpNotes(e.target.value)}
                                rows={2}
                                placeholder="Any general care notes for this patient…"
                                className="input-base w-full resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowCarePlanModal(false)}>Cancel</Button>
                            <Button
                                loading={updateCarePlanMut.isPending}
                                onClick={() => updateCarePlanMut.mutate({
                                    medications: cpMeds.filter((m) => m.name.trim()),
                                    expected_recovery_date: cpRecoveryDate || undefined,
                                    recovery_duration: cpDuration || undefined,
                                    care_notes: cpNotes || undefined,
                                })}
                            >
                                Save Care Plan
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* ── Task Modal ────────────────────────────────── */}
                <Modal
                    open={showTaskModal}
                    onClose={() => { setShowTaskModal(false); setEditTask(null); resetTaskForm(); }}
                    title={editTask ? "Edit Task" : "Add Recovery Task"}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="label-sm">Task Title *</label>
                            <Input placeholder='e.g. "Walk 10 minutes daily"' value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-sm">Description</label>
                            <textarea
                                value={taskDesc}
                                onChange={(e) => setTaskDesc(e.target.value)}
                                rows={2}
                                placeholder="Additional context or instructions…"
                                className="input-base w-full resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label-sm flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Frequency
                                </label>
                                <Input placeholder='e.g. "Daily", "3x/week"' value={taskFreq}
                                    onChange={(e) => setTaskFreq(e.target.value)} />
                            </div>
                            <div>
                                <label className="label-sm flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Due Date
                                </label>
                                <Input type="date" value={taskDue}
                                    onChange={(e) => setTaskDue(e.target.value)} />
                            </div>
                        </div>
                        {editTask && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="task-active"
                                    checked={editTask.is_active}
                                    onChange={(e) => setEditTask({ ...editTask, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                                />
                                <label htmlFor="task-active" className="text-sm text-gray-700">Task is active (visible to patient)</label>
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setShowTaskModal(false); setEditTask(null); resetTaskForm(); }}>
                                Cancel
                            </Button>
                            <Button
                                disabled={!taskTitle.trim()}
                                loading={createTaskMut.isPending || updateTaskMut.isPending}
                                onClick={() => {
                                    if (editTask) {
                                        updateTaskMut.mutate({
                                            tid: editTask.id,
                                            body: {
                                                title: taskTitle,
                                                description: taskDesc || undefined,
                                                frequency: taskFreq || undefined,
                                                due_date: taskDue || undefined,
                                                is_active: editTask.is_active,
                                            },
                                        });
                                    } else {
                                        createTaskMut.mutate({
                                            title: taskTitle,
                                            description: taskDesc || undefined,
                                            frequency: taskFreq || undefined,
                                            due_date: taskDue || undefined,
                                        });
                                    }
                                }}
                            >
                                {editTask ? "Save Changes" : "Assign Task"}
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* ── Escalation Review Modal ───────────────────── */}
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

                {/* ── Surgery Details Modal ─────────────────────── */}
                <Modal
                    open={showSurgeryModal}
                    onClose={() => setShowSurgeryModal(false)}
                    title="Edit Surgery Details"
                >
                    <div className="space-y-4">
                        <Input
                            label="Surgery Type"
                            placeholder="e.g. Knee replacement"
                            value={surgeryType}
                            onChange={(e) => setSurgeryType(e.target.value)}
                        />
                        <Input
                            label="Surgery Date"
                            type="date"
                            value={surgeryDate}
                            onChange={(e) => setSurgeryDate(e.target.value)}
                        />
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowSurgeryModal(false)}>
                                Cancel
                            </Button>
                            <Button
                                loading={updateSurgeryMut.isPending}
                                onClick={() => updateSurgeryMut.mutate({ type: surgeryType, date: surgeryDate })}
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </PageTransition>
    );
}


