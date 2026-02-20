import { useStore } from "@/store/useStore";
import { useMutation } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Modal from "@/components/Modal";
import { PageTransition } from "@/components/motion";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";

export default function SOSPage() {
    const addToast = useStore((s) => s.addToast);
    const [showConfirm, setShowConfirm] = useState(false);
    const [notes, setNotes] = useState("");

    const mutation = useMutation({
        mutationFn: (n?: string) => patientApi.triggerSOS(n),
        onSuccess: () => {
            addToast("success", "SOS Sent", "Your doctor has been alerted immediately.");
            setShowConfirm(false);
            setNotes("");
        },
        onError: (err: Error) => addToast("error", "SOS Failed", err.message),
    });

    return (
        <PageTransition>
            <div className="mx-auto max-w-md space-y-6 pt-6">
                {/* Main SOS Card */}
                <div className="relative overflow-hidden rounded-2xl p-8 text-center" style={{ background: "linear-gradient(145deg, #2d0a0a, #450f0f, #7f1d1d)", boxShadow: "0 0 64px rgb(220 38 38 / 0.25), 0 8px 32px rgb(0 0 0 / 0.3)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {/* Pulsing background glow */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="h-64 w-64 rounded-full bg-red-600 opacity-10 animate-pulse" style={{ filter: "blur(60px)" }} />
                    </div>

                    <div className="relative">
                        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" style={{ animationDuration: "2s" }} />
                            <div className="absolute inset-2 rounded-full bg-red-500 opacity-15 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)" }}>
                                <AlertTriangle className="h-9 w-9 text-red-400" />
                            </div>
                        </div>

                        <h1 className="text-2xl font-black text-white tracking-tight">Emergency SOS</h1>
                        <p className="mt-3 text-sm leading-relaxed text-red-200/60">
                            Use this if you&apos;re experiencing severe symptoms and need
                            immediate attention from your doctor.
                        </p>

                        <button
                            className="mt-8 w-full rounded-2xl py-4 text-[15px] font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 0 32px rgb(239 68 68 / 0.5), 0 4px 16px rgb(0 0 0 / 0.3)" }}
                            onClick={() => setShowConfirm(true)}
                        >
                            Send SOS Alert
                        </button>
                    </div>
                </div>

                <Modal
                    open={showConfirm}
                    onClose={() => setShowConfirm(false)}
                    title="Confirm SOS"
                >
                    <p className="text-sm text-gray-600 mb-4">
                        This will immediately notify your doctor with a critical alert. Are you
                        sure?
                    </p>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe what you're experiencing (optional)"
                        className="input-base mb-4 resize-none"
                        rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setShowConfirm(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            loading={mutation.isPending}
                            onClick={() => mutation.mutate(notes || undefined)}
                        >
                            Confirm SOS
                        </Button>
                    </div>
                </Modal>
            </div>
        </PageTransition>
    );
}
