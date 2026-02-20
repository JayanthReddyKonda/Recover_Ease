import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { symptomApi } from "@/api/symptom.api";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Slider from "@/components/Slider";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import { PageTransition } from "@/components/motion";
import { Mic, MicOff, Send, CheckCircle, Sparkles } from "lucide-react";
import type { LogSymptomRequest } from "@/types";

// ─── Smart voice command parser ─────────────────────────────

type SymptomField = "pain_level" | "fatigue_level" | "mood" | "sleep_hours" | "appetite" | "energy" | "temperature";

const PATTERNS: [SymptomField, RegExp][] = [
    ["pain_level", /\b(?:pain|painful|hurting|aching|hurt)(?:\s+(?:is|level|score|at|rating|of|today))?\s+(?:a\s+)?(\d+(?:\.\d+)?)(?:\s+out\s+of\s+\d+)?\b/i],
    ["fatigue_level", /\b(?:fatigue|fatigued|tired|tiredness|exhausted|exhaustion|weary)(?:\s+(?:is|level|score|at|rating))?\s+(?:a\s+)?(\d+(?:\.\d+)?)(?:\s+out\s+of\s+\d+)?\b/i],
    ["mood", /\b(?:mood|feeling|emotional|spirit|spirits)(?:\s+(?:is|are|was|at|today|score|rating))?\s+(?:a\s+)?(\d+(?:\.\d+)?)(?:\s+out\s+of\s+\d+)?\b/i],
    ["sleep_hours", /\b(?:slept|sleep|sleeping|got)\s+(?:about\s+|around\s+|only\s+|just\s+)?(\d+(?:\.\d+)?)\s+(?:hours?|hrs?)(?:\s+of\s+sleep)?\b/i],
    ["appetite", /\b(?:appetite|hungry|hunger|eating|food)(?:\s+(?:is|was|level|score|at|rating))?\s+(?:a\s+)?(\d+(?:\.\d+)?)(?:\s+out\s+of\s+\d+)?\b/i],
    ["energy", /\b(?:energy|energetic|stamina|vitality)(?:\s+(?:is|was|level|score|at|today))?\s+(?:a\s+)?(\d+(?:\.\d+)?)(?:\s+out\s+of\s+\d+)?\b/i],
    ["temperature", /\b(?:temperature|temp|fever)\s+(?:is\s+|of\s+|at\s+)?(\d+(?:\.\d+)?)\s*(?:degrees?|°[FC]?)?\b/i],
];

const FIELD_LABELS: Record<SymptomField, string> = {
    pain_level: "Pain",
    fatigue_level: "Fatigue",
    mood: "Mood",
    sleep_hours: "Sleep",
    appetite: "Appetite",
    energy: "Energy",
    temperature: "Temp",
};

const FIELD_LIMITS: Record<SymptomField, { min: number; max: number }> = {
    pain_level: { min: 1, max: 10 },
    fatigue_level: { min: 1, max: 10 },
    mood: { min: 1, max: 10 },
    sleep_hours: { min: 0, max: 16 },
    appetite: { min: 1, max: 10 },
    energy: { min: 1, max: 10 },
    temperature: { min: 90, max: 115 },
};

function parseVoiceCommands(
    transcript: string,
): { fields: Partial<Record<SymptomField, number>>; remaining: string } {
    const fields: Partial<Record<SymptomField, number>> = {};
    let remaining = transcript;

    for (const [key, regex] of PATTERNS) {
        const match = remaining.match(regex);
        if (match) {
            const val = parseFloat(match[1]);
            const { min, max } = FIELD_LIMITS[key];
            if (val >= min && val <= max) {
                fields[key] = val;
                remaining = remaining.replace(match[0], "").trim();
            }
        }
    }

    // Normalise leftover whitespace/punctuation
    remaining = remaining.replace(/[,;.!?]+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
    return { fields, remaining };
}

const schema = z.object({
    pain_level: z.number().min(1).max(10),
    fatigue_level: z.number().min(1).max(10),
    mood: z.number().min(1).max(10),
    sleep_hours: z.number().min(0).max(24),
    appetite: z.number().min(1).max(10),
    energy: z.number().min(1).max(10),
    temperature: z.number().optional(),
    notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function SymptomLogPage() {
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();
    const [voiceActive, setVoiceActive] = useState(false);
    const [voiceFilled, setVoiceFilled] = useState<string[]>([]);

    const todayLog = useQuery({
        queryKey: ["today-log"],
        queryFn: () => symptomApi.getTodayLog().then((r) => r.data),
    });

    const { control, handleSubmit, setValue, watch } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            pain_level: 5,
            fatigue_level: 5,
            mood: 5,
            sleep_hours: 7,
            appetite: 5,
            energy: 5,
            notes: "",
        },
    });

    const mutation = useMutation({
        mutationFn: (data: LogSymptomRequest) => symptomApi.logSymptom(data),
        onSuccess: () => {
            addToast("success", "Logged!", "Today's symptoms saved");
            qc.invalidateQueries({ queryKey: ["today-log"] });
            qc.invalidateQueries({ queryKey: ["symptom-trend"] });
            qc.invalidateQueries({ queryKey: ["symptom-summary"] });
            qc.invalidateQueries({ queryKey: ["patient-profile"] });
        },
        onError: (err: Error) => addToast("error", "Failed", err.message),
    });

    // ─── Smart Voice Input ───────────────────────────────────────
    function toggleVoice() {
        if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
            addToast("warning", "Not supported", "Speech recognition is not available in this browser");
            return;
        }

        if (voiceActive) {
            setVoiceActive(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognitionCtor: any =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        const recognition = new SpeechRecognitionCtor();
        recognition.lang = "en-US";
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            const { fields, remaining } = parseVoiceCommands(transcript);

            // Auto-fill matched slider fields
            const filled: string[] = [];
            for (const [key, val] of Object.entries(fields) as [SymptomField, number][]) {
                setValue(key, val, { shouldValidate: true });
                filled.push(`${FIELD_LABELS[key]} → ${key === "sleep_hours" ? `${val}h` : val}`);
            }

            // Append any remaining unmatched text to notes
            if (remaining) {
                const current = watch("notes") || "";
                setValue("notes", current ? `${current} ${remaining}` : remaining);
            }

            if (filled.length > 0) {
                setVoiceFilled(filled);
                addToast("success", "Voice filled", filled.join(", "));
                setTimeout(() => setVoiceFilled([]), 5000);
            } else if (!remaining) {
                addToast("info", "Nothing matched", "Try saying \"pain is 7\" or \"I slept 8 hours\"");
            }
        };

        recognition.onerror = () => {
            setVoiceActive(false);
            addToast("error", "Voice error", "Could not capture audio");
        };
        recognition.onend = () => setVoiceActive(false);

        setVoiceActive(true);
        recognition.start();
    }

    // Already logged today
    if (todayLog.data) {
        return (
            <PageTransition>
                <div className="mx-auto max-w-lg space-y-6">
                    <div className="relative overflow-hidden rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, #052e16, #064e3b, #065f46)", border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 8px 32px rgb(16 185 129 / 0.15)" }}>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)", boxShadow: "0 0 24px rgb(16 185 129 / 0.3)" }}>
                            <CheckCircle className="h-8 w-8 text-emerald-400" />
                        </div>
                        <h2 className="mt-4 text-xl font-bold text-white">Already Logged Today</h2>
                        <div className="mt-3 flex justify-center gap-4">
                            <div className="rounded-xl bg-white/5 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Pain</p>
                                <p className="text-lg font-bold text-white">{todayLog.data.pain_level}<span className="text-sm text-white/40">/10</span></p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Mood</p>
                                <p className="text-lg font-bold text-white">{todayLog.data.mood}<span className="text-sm text-white/40">/10</span></p>
                            </div>
                            <div className="rounded-xl bg-white/5 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">Energy</p>
                                <p className="text-lg font-bold text-white">{todayLog.data.energy}<span className="text-sm text-white/40">/10</span></p>
                            </div>
                        </div>
                        {todayLog.data.ai_insight && (
                            <div className="mt-4 rounded-xl bg-white/5 p-4 text-left" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">AI Insight</p>
                                <p className="text-sm text-white/70">{todayLog.data.ai_insight.summary}</p>
                            </div>
                        )}
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="mx-auto max-w-lg space-y-6">
                <h1 className="page-heading">Log Symptoms</h1>

                <form
                    onSubmit={handleSubmit((d) => mutation.mutate(d))}
                    onKeyDown={(e) => {
                        // Prevent accidental form submission when pressing Enter on
                        // sliders, number inputs, or textareas — only the submit button should fire
                        if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "BUTTON") {
                            e.preventDefault();
                        }
                    }}
                    className="space-y-5"
                >
                    <Card>
                        <div className="space-y-5">
                            <Controller
                                control={control}
                                name="pain_level"
                                render={({ field }) => (
                                    <Slider label="Pain Level" value={field.value} onChange={field.onChange} lowLabel="None" highLabel="Severe" />
                                )}
                            />
                            <Controller
                                control={control}
                                name="fatigue_level"
                                render={({ field }) => (
                                    <Slider label="Fatigue" value={field.value} onChange={field.onChange} lowLabel="None" highLabel="Extreme" />
                                )}
                            />
                            <Controller
                                control={control}
                                name="mood"
                                render={({ field }) => (
                                    <Slider label="Mood" value={field.value} onChange={field.onChange} lowLabel="Low" highLabel="Great" />
                                )}
                            />
                            <Controller
                                control={control}
                                name="energy"
                                render={({ field }) => (
                                    <Slider label="Energy" value={field.value} onChange={field.onChange} lowLabel="Drained" highLabel="Energized" />
                                )}
                            />
                            <Controller
                                control={control}
                                name="appetite"
                                render={({ field }) => (
                                    <Slider label="Appetite" value={field.value} onChange={field.onChange} lowLabel="None" highLabel="Strong" />
                                )}
                            />
                            <Controller
                                control={control}
                                name="sleep_hours"
                                render={({ field }) => (
                                    <Slider label="Sleep Hours" value={field.value} onChange={field.onChange} min={0} max={16} step={0.5} lowLabel="0h" highLabel="16h" />
                                )}
                            />
                        </div>
                    </Card>

                    <Card>
                        <Input
                            label="Temperature (°F, optional)"
                            type="number"
                            step="0.1"
                            placeholder="98.6"
                            onChange={(e) => setValue("temperature", e.target.value ? Number(e.target.value) : undefined)}
                        />
                    </Card>

                    <Card>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-700">Notes</label>
                            <button
                                type="button"
                                onClick={toggleVoice}
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${voiceActive ? "bg-red-100 text-red-600" : "bg-primary-50 text-primary-600 hover:bg-primary-100"}`}
                                title="Smart voice input — say things like 'pain is 7' or 'I slept 8 hours'"
                            >
                                {voiceActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                                {voiceActive ? "Stop" : "Smart Voice"}
                            </button>
                        </div>

                        {voiceActive && (
                            <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
                                <div className="flex gap-0.5 items-end h-4">
                                    {[2, 4, 3, 5, 2, 4, 3, 4].map((h, i) => (
                                        <span
                                            key={i}
                                            className="w-0.5 rounded-full bg-red-400 animate-bounce"
                                            style={{ height: `${h * 2}px`, animationDelay: `${i * 0.07}s` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-red-600 font-medium">Listening…</span>
                                <span className="ml-auto text-xs text-red-400">Try: "pain is 7", "slept 6 hours", "mood 4"</span>
                            </div>
                        )}

                        {voiceFilled.length > 0 && (
                            <div className="mb-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span className="text-xs font-medium text-emerald-700">Auto-filled:</span>
                                    {voiceFilled.map((f, i) => (
                                        <Badge key={i} variant="normal" className="text-[10px] bg-emerald-100 text-emerald-700">{f}</Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Controller
                            control={control}
                            name="notes"
                            render={({ field }) => (
                                <textarea
                                    {...field}
                                    rows={3}
                                    placeholder="Any additional notes about how you're feeling…"
                                    className="input-base resize-none"
                                />
                            )}
                        />
                    </Card>

                    <Button type="submit" loading={mutation.isPending} className="w-full">
                        <Send className="h-4 w-4" /> Submit Log
                    </Button>
                </form>
            </div>
        </PageTransition>
    );
}
