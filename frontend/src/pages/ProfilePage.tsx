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
import { useState } from "react";
import { User, Link2, Unlink } from "lucide-react";
import type { ProfileUpdateRequest } from "@/types";

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
    const [showDisconnect, setShowDisconnect] = useState(false);

    const doctor = useQuery({
        queryKey: ["my-doctor"],
        queryFn: () => requestApi.getMyDoctor().then((r) => r.data),
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
        mutationFn: (id: string) => requestApi.disconnect(id),
        onSuccess: () => {
            addToast("info", "Disconnected", "Doctor link removed");
            qc.invalidateQueries({ queryKey: ["my-doctor"] });
            setShowDisconnect(false);
        },
    });

    return (
        <div className="mx-auto max-w-lg space-y-6">
            <h1 className="page-heading">Profile</h1>

            {/* Info card */}
            <Card className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <User className="h-7 w-7" />
                </div>
                <div>
                    <p className="font-semibold">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <Badge variant={user?.role === "DOCTOR" ? "normal" : "recovering"} className="mt-1">
                        {user?.role}
                    </Badge>
                </div>
            </Card>

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

            {/* Doctor link (patient only) */}
            {user?.role === "PATIENT" && (
                <Card>
                    <h2 className="section-heading mb-3">
                        <Link2 className="mr-1 inline h-4 w-4" /> Linked Doctor
                    </h2>
                    {doctor.isLoading ? (
                        <Skeleton lines={2} />
                    ) : doctor.data ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">{doctor.data.name}</p>
                                <p className="text-xs text-gray-400">{doctor.data.email}</p>
                            </div>
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setShowDisconnect(true)}
                            >
                                <Unlink className="mr-1 h-3 w-3 inline" /> Disconnect
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400">Not linked to a doctor yet</p>
                    )}
                </Card>
            )}

            {/* Disconnect confirmation */}
            <Modal
                open={showDisconnect}
                onClose={() => setShowDisconnect(false)}
                title="Disconnect Doctor?"
            >
                <p className="text-sm text-gray-600 mb-4">
                    This will remove the link between you and your doctor. They will no
                    longer see your symptom logs or receive alerts.
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => setShowDisconnect(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        loading={disconnectMut.isPending}
                        onClick={() => doctor.data && disconnectMut.mutate(doctor.data.id)}
                    >
                        Disconnect
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
