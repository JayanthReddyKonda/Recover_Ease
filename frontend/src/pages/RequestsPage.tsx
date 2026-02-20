import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import Skeleton from "@/components/Skeleton";
import { PageTransition } from "@/components/motion";
import { useState } from "react";
import { UserPlus, Check, X, Mail, Hash } from "lucide-react";

type SendMode = "email" | "code";

export default function RequestsPage() {
    const { user } = useAuth();
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();
    const [mode, setMode] = useState<SendMode>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const pending = useQuery({
        queryKey: ["pending-requests"],
        queryFn: () => requestApi.getPending().then((r) => r.data),
    });

    const sendMut = useMutation({
        mutationFn: () => {
            if (mode === "code") {
                return requestApi.sendRequest({ connect_code: code.trim().toUpperCase() });
            }
            return requestApi.sendRequest({ to_email: email.trim() });
        },
        onSuccess: () => {
            const target = mode === "code" ? code.toUpperCase() : email;
            addToast("success", "Request sent", `Sent to ${target}`);
            setEmail("");
            setCode("");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
        },
        onError: (err: Error) => addToast("error", "Failed", err.message),
    });

    const acceptMut = useMutation({
        mutationFn: (id: string) => requestApi.acceptRequest(id),
        onSuccess: () => {
            addToast("success", "Accepted", "Connection established");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
            qc.invalidateQueries({ queryKey: ["my-patients"] });
            qc.invalidateQueries({ queryKey: ["my-doctors"] });
        },
    });

    const rejectMut = useMutation({
        mutationFn: (id: string) => requestApi.rejectRequest(id),
        onSuccess: () => {
            addToast("info", "Rejected", "Request declined");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
        },
    });

    const incoming = pending.data?.filter((r) => r.to_id === user?.id) ?? [];
    const outgoing = pending.data?.filter((r) => r.from_id === user?.id) ?? [];
    const canSend = mode === "code" ? code.trim().length === 6 : email.trim().length > 0;

    return (
        <PageTransition>
            <div className="mx-auto max-w-lg space-y-6">
                <h1 className="page-heading">Connection Requests</h1>

                {/* Send request */}
                <Card>
                    <h2 className="section-heading mb-3">
                        <UserPlus className="mr-1 inline h-4 w-4" />{" "}
                        {user?.role === "PATIENT" ? "Connect with a Doctor" : "Invite a Patient"}
                    </h2>

                    {/* Mode tabs */}
                    <div className="flex gap-1 rounded-lg bg-gray-100 p-1 mb-3">
                        <button
                            type="button"
                            onClick={() => setMode("email")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${mode === "email"
                                    ? "bg-white text-primary-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Mail className="h-3.5 w-3.5" /> Email
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("code")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${mode === "code"
                                    ? "bg-white text-primary-700 shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                }`}
                        >
                            <Hash className="h-3.5 w-3.5" /> Connect Code
                        </button>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (canSend) sendMut.mutate();
                        }}
                        className="flex gap-2"
                    >
                        {mode === "email" ? (
                            <Input
                                placeholder={
                                    user?.role === "PATIENT"
                                        ? "doctor@example.com"
                                        : "patient@example.com"
                                }
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="flex-1"
                            />
                        ) : (
                            <Input
                                placeholder="e.g. A3B9X2"
                                value={code}
                                maxLength={6}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                className="flex-1 font-mono tracking-widest uppercase"
                            />
                        )}
                        <Button type="submit" loading={sendMut.isPending} disabled={!canSend}>
                            Send
                        </Button>
                    </form>
                    {mode === "code" && (
                        <p className="mt-2 text-xs text-gray-400">
                            Enter the 6-character code shown on the other person's Profile page.
                        </p>
                    )}
                </Card>

                {/* Incoming */}
                <Card>
                    <h2 className="section-heading mb-3">Incoming</h2>
                    {pending.isLoading ? (
                        <Skeleton lines={4} />
                    ) : incoming.length > 0 ? (
                        <ul className="space-y-2">
                            {incoming.map((r) => (
                                <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                                    <div>
                                        <p className="text-sm font-medium">{r.from_user?.name ?? "Unknown"}</p>
                                        <p className="text-xs text-gray-400">{r.from_user?.email}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="primary"
                                            onClick={() => acceptMut.mutate(r.id)}
                                            loading={acceptMut.isPending}
                                        >
                                            <Check className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="danger"
                                            onClick={() => rejectMut.mutate(r.id)}
                                            loading={rejectMut.isPending}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400">No incoming requests</p>
                    )}
                </Card>

                {/* Outgoing */}
                <Card>
                    <h2 className="section-heading mb-3">Outgoing</h2>
                    {outgoing.length > 0 ? (
                        <ul className="space-y-2">
                            {outgoing.map((r) => (
                                <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                                    <div>
                                        <p className="text-sm font-medium">{r.to_user?.name ?? "Unknown"}</p>
                                        <p className="text-xs text-gray-400">{r.to_user?.email}</p>
                                    </div>
                                    <Badge variant="pending">Pending</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400">No outgoing requests</p>
                    )}
                </Card>
            </div>
        </PageTransition>
    );
}



