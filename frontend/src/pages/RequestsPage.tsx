import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    UserPlus, Check, X, Mail, Hash, Plus, Trash2, Stethoscope,
    Pill, AlertTriangle, ClipboardList, ChevronRight, ChevronLeft,
    Sparkles, Calendar, Activity, Utensils, Clock, ShieldAlert,
} from "lucide-react";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import type { AiStructuredPlan, MedicationInput, RequestResponse, SafeUser } from "@/types";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import Skeleton from "@/components/Skeleton";
import { PageTransition } from "@/components/motion";

// ─── Urgency config ───────────────────────────────────
const urgencyStyles: Record<string, string> = {
    low: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-red-100 text-red-700 border-red-200",
    critical: "bg-red-200 text-red-800 border-red-300 font-bold",
};

// ─── AI Care Plan card (patient-facing) ───────────────
function AiCarePlanCard({ plan }: { plan: AiStructuredPlan }) {
    const [expanded, setExpanded] = useState(false);
    const urgencyKey = (plan.urgency ?? "medium").toLowerCase().split(" ")[0];
    return (
        <div className="mt-3 rounded-xl border border-primary-100 bg-primary-50/60 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary-500 shrink-0" />
                    <span className="text-sm font-semibold text-primary-800">AI Care Plan</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${urgencyStyles[urgencyKey] ?? urgencyStyles.medium}`}>
                    {plan.urgency}
                </span>
            </div>

            {/* Condition summary */}
            <p className="text-sm text-gray-700">{plan.condition_summary}</p>

            {/* Keywords */}
            {plan.diagnosis_keywords?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {plan.diagnosis_keywords.map((kw) => (
                        <span key={kw} className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                            {kw}
                        </span>
                    ))}
                </div>
            )}

            {/* Risk flags */}
            {plan.risk_flags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {plan.risk_flags.map((f) => (
                        <span key={f} className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            <AlertTriangle className="h-3 w-3" />{f}
                        </span>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 overflow-hidden"
                    >
                        {/* Medications */}
                        {plan.medication_schedule?.length > 0 && (
                            <div>
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <Pill className="h-3.5 w-3.5" /> Medication Schedule
                                </p>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50 text-gray-500">
                                            <tr>
                                                <th className="px-3 py-1.5 text-left">Medication</th>
                                                <th className="px-3 py-1.5 text-left">Dosage</th>
                                                <th className="px-3 py-1.5 text-left">Frequency</th>
                                                <th className="px-3 py-1.5 text-left">Time</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {plan.medication_schedule.map((m, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-1.5 font-medium">{m.name}</td>
                                                    <td className="px-3 py-1.5">{m.dosage}</td>
                                                    <td className="px-3 py-1.5">{m.frequency}</td>
                                                    <td className="px-3 py-1.5">{m.time_of_day}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Care instructions */}
                        {plan.care_instructions?.length > 0 && (
                            <div>
                                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <ClipboardList className="h-3.5 w-3.5" /> Care Instructions
                                </p>
                                <ul className="space-y-1">
                                    {plan.care_instructions.map((c, i) => (
                                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                                            <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0 mt-1.5" />
                                            {c}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Diet + Activity */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {plan.dietary_notes && (
                                <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                                    <p className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1">
                                        <Utensils className="h-3 w-3" /> Dietary Notes
                                    </p>
                                    <p className="text-xs text-gray-700">{plan.dietary_notes}</p>
                                </div>
                            )}
                            {plan.activity_restrictions && (
                                <div className="rounded-lg bg-white border border-gray-100 p-2.5">
                                    <p className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-1">
                                        <Activity className="h-3 w-3" /> Activity
                                    </p>
                                    <p className="text-xs text-gray-700">{plan.activity_restrictions}</p>
                                </div>
                            )}
                        </div>

                        {/* Follow-up */}
                        {plan.follow_up_timeline && (
                            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <span className="text-xs text-amber-800">{plan.follow_up_timeline}</span>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                type="button"
                onClick={() => setExpanded((p) => !p)}
                className="flex w-full items-center justify-center gap-1 text-xs text-primary-600 hover:text-primary-800 transition-colors"
            >
                {expanded ? "Show less" : "View full care plan"}
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
        </div>
    );
}

// ─── Patient view ──────────────────────────────────────
function PatientView() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const addToast = useStore((s) => s.addToast);

    const pending = useQuery({
        queryKey: ["pending-requests"],
        queryFn: () => requestApi.getPending().then((r) => r.data ?? []),
    });

    const acceptMut = useMutation({
        mutationFn: (id: string) => requestApi.acceptRequest(id),
        onSuccess: () => {
            addToast("success", "Accepted", "Doctor connection established");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
            qc.invalidateQueries({ queryKey: ["my-doctors"] });
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const rejectMut = useMutation({
        mutationFn: (id: string) => requestApi.rejectRequest(id),
        onSuccess: () => {
            addToast("info", "Declined", "Request rejected");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
        },
    });

    const incoming = (pending.data ?? []).filter((r) => r.to_id === user?.id);

    return (
        <div className="space-y-4">
            <h2 className="section-heading flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary-500" /> Incoming Care Plans from Doctors
            </h2>
            {pending.isLoading ? (
                <Skeleton lines={5} />
            ) : incoming.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                    <Stethoscope className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">No pending requests from doctors</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {incoming.map((r) => (
                        <motion.div
                            key={r.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                        >
                            {/* Doctor info */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 font-bold text-sm">
                                        {(r.from_user?.name ?? "D").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{r.from_user?.name ?? "Unknown Doctor"}</p>
                                        <p className="text-xs text-gray-400">{r.from_user?.email}</p>
                                    </div>
                                </div>
                                {r.specialty && (
                                    <Badge variant="monitor">{r.specialty}</Badge>
                                )}
                            </div>

                            {/* Visit date + disease */}
                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {r.visit_date && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                        <Calendar className="h-3.5 w-3.5 text-primary-400" />
                                        Visit: {new Date(r.visit_date).toLocaleDateString()}
                                    </div>
                                )}
                                {r.disease_description && (
                                    <p className="text-xs text-gray-600 line-clamp-2">{r.disease_description}</p>
                                )}
                            </div>

                            {/* AI care plan */}
                            {r.ai_structured_plan && (
                                <AiCarePlanCard plan={r.ai_structured_plan} />
                            )}

                            {/* Actions */}
                            <div className="mt-4 flex gap-2">
                                <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => acceptMut.mutate(r.id)}
                                    loading={acceptMut.isPending}
                                    className="flex-1"
                                >
                                    <Check className="mr-1 h-3.5 w-3.5" /> Accept Plan
                                </Button>
                                <Button
                                    size="sm"
                                    variant="danger"
                                    onClick={() => rejectMut.mutate(r.id)}
                                    loading={rejectMut.isPending}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── empty medication row ─────────────────────────────
const emptyMed = (): MedicationInput => ({
    name: "", dosage: "", frequency: "", time_of_day: "", instructions: "",
});

// ─── Doctor view (multi-step) ─────────────────────────
type SendMode = "email" | "code";
type Step = 1 | 2 | 3;

function DoctorView() {
    const qc = useQueryClient();
    const addToast = useStore((s) => s.addToast);

    const [step, setStep] = useState<Step>(1);
    const [mode, setMode] = useState<SendMode>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [lookedUpPatient, setLookedUpPatient] = useState<SafeUser | null>(null);

    // Step-2 clinical fields
    const [specialty, setSpecialty] = useState("");
    const [visitDate, setVisitDate] = useState("");
    const [diseaseDesc, setDiseaseDesc] = useState("");
    const [medications, setMedications] = useState<MedicationInput[]>([emptyMed()]);

    // Step-3 result
    const [sentRequest, setSentRequest] = useState<RequestResponse | null>(null);

    // pending outgoing
    const pending = useQuery({
        queryKey: ["pending-requests"],
        queryFn: () => requestApi.getPending().then((r) => r.data ?? []),
    });

    // Lookup patient by code
    const lookupMut = useMutation({
        mutationFn: (c: string) => requestApi.lookupByCode(c).then((r) => r.data),
        onSuccess: (data) => {
            if (data) { setLookedUpPatient(data); setStep(2); }
            else addToast("warning", "Not found", "No patient with that code");
        },
        onError: (e: Error) => addToast("error", "Lookup failed", e.message),
    });

    const sendMut = useMutation({
        mutationFn: () => {
            const payload = {
                ...(mode === "email" ? { to_email: email.trim() } : { connect_code: code.trim().toUpperCase() }),
                specialty: specialty.trim() || undefined,
                visit_date: visitDate || undefined,
                disease_description: diseaseDesc.trim(),
                medications: medications.filter((m) => m.name.trim()),
            };
            return requestApi.sendRequest(payload as Parameters<typeof requestApi.sendRequest>[0]);
        },
        onSuccess: (res) => {
            setSentRequest(res.data ?? null);
            setStep(3);
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
            addToast("success", "Plan sent!", "AI structured care plan delivered to patient.");
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const updateMed = (i: number, field: keyof MedicationInput, value: string) => {
        setMedications((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: value };
            return next;
        });
    };
    const addMed = () => setMedications((p) => [...p, emptyMed()]);
    const removeMed = (i: number) => setMedications((p) => p.filter((_, idx) => idx !== i));

    const handleStep1Submit = () => {
        if (mode === "code") {
            lookupMut.mutate(code.trim());
        } else {
            setStep(2);
        }
    };

    const { user } = useAuth();
    const outgoing = (pending.data ?? []).filter((r) => r.from_id === user?.id);

    return (
        <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2">
                {([1, 2, 3] as Step[]).map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all
                            ${step === s ? "bg-primary-600 text-white shadow-lg shadow-primary-200"
                                : step > s ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                            {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                        </div>
                        <span className={`text-xs font-medium ${step === s ? "text-primary-700" : "text-gray-400"}`}>
                            {s === 1 ? "Find Patient" : s === 2 ? "Clinical Details" : "Sent"}
                        </span>
                        {i < 2 && <ChevronRight className="h-4 w-4 text-gray-300" />}
                    </div>
                ))}
            </div>

            {/* ── Step 1: find patient ── */}
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <Card>
                            <h2 className="section-heading mb-4 flex items-center gap-2">
                                <UserPlus className="h-4 w-4" /> Find Patient
                            </h2>

                            {/* Mode tabs */}
                            <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-4">
                                {(["email", "code"] as SendMode[]).map((m) => (
                                    <button key={m} type="button" onClick={() => setMode(m)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all
                                            ${mode === m ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                                        {m === "email" ? <><Mail className="h-3.5 w-3.5" /> Email</> : <><Hash className="h-3.5 w-3.5" /> Connect Code</>}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                {mode === "email" ? (
                                    <Input placeholder="patient@example.com" type="email" value={email}
                                        onChange={(e) => setEmail(e.target.value)} className="flex-1" />
                                ) : (
                                    <Input placeholder="A3B9X2" value={code} maxLength={6}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        className="flex-1 font-mono tracking-widest uppercase" />
                                )}
                                <Button onClick={handleStep1Submit}
                                    loading={lookupMut.isPending}
                                    disabled={mode === "email" ? !email.trim() : code.trim().length !== 6}>
                                    Next <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </div>

                            {/* Looked-up patient preview */}
                            {lookedUpPatient && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 font-bold text-sm">
                                        {lookedUpPatient.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-900">{lookedUpPatient.name}</p>
                                        <p className="text-xs text-emerald-600">{lookedUpPatient.email}</p>
                                    </div>
                                    <Check className="ml-auto h-4 w-4 text-emerald-600" />
                                </motion.div>
                            )}
                        </Card>
                    </motion.div>
                )}

                {/* ── Step 2: clinical form ── */}
                {step === 2 && (
                    <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <Card>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="section-heading flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4" /> Clinical Details
                                </h2>
                                <button type="button" onClick={() => { setStep(1); setLookedUpPatient(null); }}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
                                    <ChevronLeft className="h-3.5 w-3.5" /> Back
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Specialty + Visit date */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="label-sm">Specialty (optional)</label>
                                        <Input placeholder="e.g. Orthopedics" value={specialty}
                                            onChange={(e) => setSpecialty(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="label-sm flex items-center gap-1"><Calendar className="h-3 w-3" /> Visit / Surgery Date</label>
                                        <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                                    </div>
                                </div>

                                {/* Disease description */}
                                <div>
                                    <label className="label-sm">Disease / Condition Description *</label>
                                    <textarea
                                        value={diseaseDesc}
                                        onChange={(e) => setDiseaseDesc(e.target.value)}
                                        rows={3}
                                        placeholder="Describe the patient's condition, diagnosis, and relevant medical history…"
                                        className="input-base w-full resize-none"
                                    />
                                </div>

                                {/* Medications */}
                                <div>
                                    <div className="mb-2 flex items-center justify-between">
                                        <label className="label-sm flex items-center gap-1"><Pill className="h-3 w-3" /> Medications</label>
                                        <button type="button" onClick={addMed}
                                            className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs text-primary-700 hover:bg-primary-100 transition-colors">
                                            <Plus className="h-3 w-3" /> Add
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {medications.map((med, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                                className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-500">Medicine #{i + 1}</span>
                                                    {medications.length > 1 && (
                                                        <button type="button" onClick={() => removeMed(i)}
                                                            className="text-red-400 hover:text-red-600 transition-colors">
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                                                        className="col-span-2 sm:col-span-2" />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 flex items-center gap-2">
                                    <div className="flex-1 rounded-lg bg-primary-50 border border-primary-100 px-3 py-2">
                                        <p className="flex items-center gap-1.5 text-xs text-primary-700">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            AI will analyse and structure this into a personalised care plan for the patient.
                                        </p>
                                    </div>
                                    <Button onClick={() => sendMut.mutate()} loading={sendMut.isPending}
                                        disabled={!diseaseDesc.trim()}>
                                        Send Plan <ChevronRight className="ml-1 h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* ── Step 3: success + AI plan preview ── */}
                {step === 3 && (
                    <motion.div key="s3" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                        <Card>
                            <div className="flex flex-col items-center gap-2 py-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                                    <Check className="h-6 w-6 text-emerald-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Care Plan Sent!</h3>
                                <p className="text-sm text-gray-500 text-center">
                                    The patient will receive the AI-structured care plan and can accept or decline.
                                </p>
                            </div>

                            {sentRequest?.ai_structured_plan && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">AI-generated plan preview</p>
                                    <AiCarePlanCard plan={sentRequest.ai_structured_plan} />
                                </div>
                            )}

                            <button type="button" onClick={() => { setStep(1); setEmail(""); setCode(""); setLookedUpPatient(null); setSpecialty(""); setVisitDate(""); setDiseaseDesc(""); setMedications([emptyMed()]); setSentRequest(null); }}
                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 py-2 text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors">
                                <Plus className="h-4 w-4" /> Send Another Plan
                            </button>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Outgoing (pending) requests */}
            {outgoing.length > 0 && (
                <Card>
                    <h2 className="section-heading mb-3">Pending Responses</h2>
                    <ul className="space-y-2">
                        {outgoing.map((r) => (
                            <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                                <div>
                                    <p className="text-sm font-medium">{r.to_user?.name ?? "Unknown"}</p>
                                    <p className="text-xs text-gray-400">{r.to_user?.email}</p>
                                    {r.disease_description && (
                                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{r.disease_description}</p>
                                    )}
                                </div>
                                <Badge variant="pending">Awaiting</Badge>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────
export default function RequestsPage() {
    const { user } = useAuth();
    const isDoctor = user?.role === "DOCTOR";

    return (
        <PageTransition>
            <div className="mx-auto max-w-2xl space-y-6">
                <h1 className="page-heading">
                    {isDoctor ? "Send Care Plans to Patients" : "Connection Requests"}
                </h1>
                {isDoctor ? <DoctorView /> : <PatientView />}
            </div>
        </PageTransition>
    );
}

