import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Input from "@/components/Input";
import Button from "@/components/Button";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { PageTransition } from "@/components/motion";
import { useState } from "react";
import { Link2, Unlink, Hash, Smartphone } from "lucide-react";
import type { DoctorLink, ProfileUpdateRequest } from "@/types";

const profileSchema = z.object({
    name: z.string().min(1),
    caregiver_email: z.string().email().optional().or(z.literal("")),
    whatsapp_phone: z
        .string()
        .regex(/^\+[1-9]\d{6,19}$/, "Must be E.164 format, e.g. +919876543210")
        .optional()
        .or(z.literal("")),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function ProfilePage() {
    const { user } = useAuth();
    const setUser = useStore((s) => s.setUser);
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();
    const [disconnectTarget, setDisconnectTarget] = useState<DoctorLink | null>(null);

    const doctors = useQuery({
        queryKey: ["my-doctors"],
        queryFn: () => requestApi.getMyDoctors().then((r) => r.data ?? []),
        enabled: user?.role === "PATIENT",
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        values: user
            ? {
                name: user.name,
                caregiver_email: user.caregiver_email ?? "",
                whatsapp_phone: user.whatsapp_phone ?? "",
            }
            : undefined,
    });

    const updateMut = useMutation({
        mutationFn: (data: ProfileUpdateRequest) => authApi.updateProfile(data),
        onSuccess: (res) => {
            if (res.data) {
                setUser(res.data);
                addToast("success", "Saved", "Profile updated");
            }
        },
        onError: (err: Error) => addToast("error", "Update failed", err.message),
    });

    const disconnectMut = useMutation({
        mutationFn: (doctorId: string) => requestApi.disconnect(doctorId),
        onSuccess: () => {
            addToast("info", "Disconnected", "Doctor link removed");
            qc.invalidateQueries({ queryKey: ["my-doctors"] });
            setDisconnectTarget(null);
        },
    });

    return (
        <PageTransition>
            <div className="mx-auto max-w-lg space-y-6">
                <h1 className="page-heading">Profile</h1>

                {/* Info card */}
                <div className="relative overflow-hidden rounded-2xl p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)", boxShadow: "0 8px 32px rgb(79 70 229 / 0.25)" }}>
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px)" }} />
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white text-xl font-bold" style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="relative min-w-0 flex-1">
                        <p className="text-lg font-bold text-white truncate">{user?.name}</p>
                        <p className="text-sm text-white/60 truncate">{user?.email}</p>
                        <span className="mt-1.5 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/90">{user?.role}</span>
                    </div>
                </div>

                {/* Connect code (for both roles) */}
                {user?.connect_code && (
                    <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0f172a, #1e1b4b)", border: "1px solid rgba(99,102,241,0.25)", boxShadow: "0 4px 20px rgb(79 70 229 / 0.15)" }}>
                        <div className="flex items-center gap-2 mb-1">
                            <Hash className="h-4 w-4 text-indigo-400" />
                            <h2 className="text-sm font-semibold text-white/80">Your Connect Code</h2>
                        </div>
                        <p className="text-xs text-white/35 mb-4">Share this code so others can send you connection requests.</p>
                        <div className="flex items-center gap-3">
                            <span className="rounded-xl px-5 py-3 text-2xl font-mono font-bold tracking-widest text-indigo-300 select-all" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", letterSpacing: "0.25em" }}>
                                {user.connect_code}
                            </span>
                            <button
                                type="button"
                                className="rounded-xl px-3 py-2 text-xs font-semibold text-white/70 hover:text-white transition-colors"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
                                onClick={() => {
                                    navigator.clipboard.writeText(user.connect_code);
                                    addToast("success", "Copied", "Connect code copied to clipboard");
                                }}
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                )}

                {/* Edit form */}
                <Card>
                    <h2 className="section-heading mb-4">Edit Profile</h2>
                    <form
                        onSubmit={handleSubmit((d) =>
                            updateMut.mutate({
                                name: d.name,
                                caregiver_email: d.caregiver_email || null,
                                whatsapp_phone: d.whatsapp_phone || null,
                            }),
                        )}
                        className="space-y-4"
                    >
                        <Input label="Full Name" {...register("name")} error={errors.name?.message} />
                        {user?.role === "PATIENT" && (
                            <Input
                                label="Caregiver Email"
                                type="email"
                                placeholder="caregiver@example.com"
                                {...register("caregiver_email")}
                                error={errors.caregiver_email?.message}
                            />
                        )}

                        {/* WhatsApp phone — shown for both patients and doctors */}
                        <div className="rounded-xl border border-green-100 bg-green-50 p-3.5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Smartphone className="h-3.5 w-3.5 text-green-600" />
                                <span className="text-xs font-semibold text-green-700">WhatsApp Notifications</span>
                            </div>
                            <p className="text-[11px] text-green-600 mb-2.5">
                                {user?.role === "PATIENT"
                                    ? "Log symptoms by texting the bot — no app needed."
                                    : "Receive instant WhatsApp alerts when a patient escalates."}
                                {" "}Format: <code className="bg-green-100 px-1 py-0.5 rounded">+919876543210</code>
                            </p>
                            <Input
                                label="Phone Number (E.164)"
                                placeholder="+919876543210"
                                {...register("whatsapp_phone")}
                                error={errors.whatsapp_phone?.message}
                            />
                        </div>
                        <Button type="submit" loading={updateMut.isPending} disabled={!isDirty}>
                            Save Changes
                        </Button>
                    </form>
                </Card>

                {/* Linked doctors (patient only) */}
                {user?.role === "PATIENT" && (
                    <Card>
                        <h2 className="section-heading mb-3">
                            <Link2 className="mr-1 inline h-4 w-4" /> Linked Doctors
                        </h2>
                        {doctors.isLoading ? (
                            <Skeleton lines={2} />
                        ) : doctors.data && doctors.data.length > 0 ? (
                            <ul className="space-y-2">
                                {doctors.data.map((link) => (
                                    <li
                                        key={link.link_id}
                                        className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3"
                                    >
                                        <div>
                                            <p className="text-sm font-medium">{link.doctor?.name ?? "Unknown"}</p>
                                            <p className="text-xs text-gray-400">{link.doctor?.email}</p>
                                            {link.specialty && (
                                                <Badge variant="normal" className="mt-1 text-xs">
                                                    {link.specialty}
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => setDisconnectTarget(link)}
                                        >
                                            <Unlink className="mr-1 h-3 w-3 inline" /> Disconnect
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400">Not linked to any doctor yet</p>
                        )}
                    </Card>
                )}

                {/* Disconnect confirmation */}
                <Modal
                    open={!!disconnectTarget}
                    onClose={() => setDisconnectTarget(null)}
                    title="Disconnect Doctor?"
                >
                    <p className="text-sm text-gray-600 mb-4">
                        This will remove the link with <strong>{disconnectTarget?.doctor?.name}</strong>.
                        They will no longer see your symptom logs or receive alerts.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <Button variant="ghost" onClick={() => setDisconnectTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            loading={disconnectMut.isPending}
                            onClick={() =>
                                disconnectTarget?.doctor_id &&
                                disconnectMut.mutate(disconnectTarget.doctor_id)
                            }
                        >
                            Disconnect
                        </Button>
                    </div>
                </Modal>
            </div>
        </PageTransition>
    );
}


