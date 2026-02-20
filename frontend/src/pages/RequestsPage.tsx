import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";
import Skeleton from "@/components/Skeleton";
import { useState } from "react";
import { UserPlus, Check, X } from "lucide-react";

export default function RequestsPage() {
    const { user } = useAuth();
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();
    const [email, setEmail] = useState("");

    const pending = useQuery({
        queryKey: ["pending-requests"],
        queryFn: () => requestApi.getPending().then((r) => r.data),
    });

    const sendMut = useMutation({
        mutationFn: (to_email: string) => requestApi.sendRequest(to_email),
        onSuccess: () => {
            addToast("success", "Request sent", `Sent to ${email}`);
            setEmail("");
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
            qc.invalidateQueries({ queryKey: ["my-doctor"] });
        },
    });

    const rejectMut = useMutation({
        mutationFn: (id: string) => requestApi.rejectRequest(id),
        onSuccess: () => {
            addToast("info", "Rejected", "Request declined");
            qc.invalidateQueries({ queryKey: ["pending-requests"] });
        },
    });

    // Determine which requests are incoming (addressed to me)
    const incoming = pending.data?.filter((r) => r.to_id === user?.id) ?? [];
    const outgoing = pending.data?.filter((r) => r.from_id === user?.id) ?? [];

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <h1 className="page-heading">Connection Requests</h1>

            {/* Send request */}
            <Card>
                <h2 className="section-heading mb-3">
                    <UserPlus className="mr-1 inline h-4 w-4" />{" "}
                    {user?.role === "PATIENT" ? "Connect with a Doctor" : "Invite a Patient"}
                </h2>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (email.trim()) sendMut.mutate(email.trim());
                    }}
                    className="flex gap-2"
                >
                    <Input
                        placeholder="doctor@example.com"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1"
                    />
                    <Button type="submit" loading={sendMut.isPending}>
                        Send
                    </Button>
                </form>
            </Card>

            {/* Incoming */}
            <Card>
                <h2 className="section-heading mb-3">Incoming</h2>
                {pending.isLoading ? (
                    <Skeleton lines={4} />
                ) : incoming.length > 0 ? (
                    <ul className="space-y-2">
                        {incoming.map((r) => (
                            <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
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
                            <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
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
    );
}
