import { useStore } from "@/store/useStore";
import { useMutation } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Modal from "@/components/Modal";
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
        <div className="mx-auto max-w-md space-y-6 pt-10">
            <Card className="text-center">
                <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
                <h1 className="mt-4 text-2xl font-bold text-red-600">Emergency SOS</h1>
                <p className="mt-2 text-sm text-gray-500">
                    Use this if you're experiencing severe symptoms and need immediate
                    attention from your doctor.
                </p>

                <Button
                    variant="danger"
                    size="lg"
                    className="mt-6 w-full"
                    onClick={() => setShowConfirm(true)}
                >
                    🚨 Send SOS Alert
                </Button>
            </Card>

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
    );
}
