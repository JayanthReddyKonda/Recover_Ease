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
import { User, Link2, Unlink, Hash } from "lucide-react";
import type { DoctorLink, ProfileUpdateRequest } from "@/types";

const profileSchema = z.object({
    name: z.string().min(1),
    surgery_type: z.string().optional(),
    surgery_date: z.string().optional(),
    caregiver_email: z.string().email().optional().or(z.literal("")),
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
                surgery_type: user.surgery_type ?? "",
                surgery_date: user.surgery_date ?? "",
                caregiver_email: user.caregiver_email ?? "",
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
                <Card className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 text-primary-600">
                        <User className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-gray-900 truncate">{user?.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                        <Badge variant={user?.role === "DOCTOR" ? "normal" : "recovering"} className="mt-1.5">
                            {user?.role}
                        </Badge>
                    </div>
                </Card>

                {/* Connect code (for both roles) */}
                {user?.connect_code && (
                    <Card>
                        <h2 className="section-heading mb-2 flex items-center gap-1">
                            <Hash className="h-4 w-4" /> Your Connect Code
                        </h2>
                        <p className="text-xs text-gray-500 mb-3">
                            Share this code so others can send you connection requests without knowing your email.
                        </p>
                        <div className="flex items-center gap-3">
                            <span className="rounded-xl bg-primary-50 px-5 py-2.5 text-2xl font-mono font-bold tracking-widest text-primary-700 border border-primary-200 select-all">
                                {user.connect_code}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(user.connect_code);
                                    addToast("success", "Copied", "Connect code copied to clipboard");
                                }}
                            >
                                Copy
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Edit form */}
                <Card>
                    <h2 className="section-heading mb-4">Edit Profile</h2>
                    <form
                        onSubmit={handleSubmit((d) =>
                            updateMut.mutate({
                                name: d.name,
                                surgery_type: d.surgery_type || null,
                                surgery_date: d.surgery_date || null,
                                caregiver_email: d.caregiver_email || null,
                            }),
                        )}
                        className="space-y-4"
                    >
                        <Input label="Full Name" {...register("name")} error={errors.name?.message} />
                        {user?.role === "PATIENT" && (
                            <>
                                <Input label="Surgery Type" {...register("surgery_type")} />
                                <Input label="Surgery Date" type="date" {...register("surgery_date")} />
                                <Input
                                    label="Caregiver Email"
                                    type="email"
                                    {...register("caregiver_email")}
                                    error={errors.caregiver_email?.message}
                                />
                            </>
                        )}
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


