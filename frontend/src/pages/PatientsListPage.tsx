import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import { patientApi } from "@/api/patient.api";
import { useStore } from "@/store/useStore";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Button from "@/components/Button";
import Badge from "@/components/Badge";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Link } from "react-router-dom";
import type { PatientWithStatus } from "@/types";

export default function PatientsListPage() {
    const addToast = useStore((s) => s.addToast);
    const qc = useQueryClient();

    const patients = useQuery({
        queryKey: ["my-patients"],
        queryFn: () => requestApi.getMyPatients().then((r) => r.data as PatientWithStatus[]),
    });

    const toggleMut = useMutation({
        mutationFn: ({ patientId, isActive }: { patientId: string; isActive: boolean }) =>
            patientApi.setTreatmentStatus(patientId, isActive),
        onSuccess: (_res, vars) => {
            const label = vars.isActive ? "active treatment" : "recovered";
            addToast("success", "Status updated", `Patient marked as ${label}`);
            qc.invalidateQueries({ queryKey: ["my-patients"] });
        },
        onError: (err: Error) => addToast("error", "Failed", err.message),
    });

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="page-heading">Patients</h1>
                    <Link to="/requests">
                        <Button variant="outline" size="sm">Manage Requests</Button>
                    </Link>
                </div>

                {patients.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}><Skeleton lines={3} /></Card>
                        ))}
                    </div>
                ) : patients.data && patients.data.length > 0 ? (
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {patients.data.map((p, idx) => {
                            const gradients = [
                                "linear-gradient(135deg,#4f46e5,#7c3aed)",
                                "linear-gradient(135deg,#0ea5e9,#6366f1)",
                                "linear-gradient(135deg,#10b981,#0ea5e9)",
                                "linear-gradient(135deg,#f59e0b,#ef4444)",
                                "linear-gradient(135deg,#ec4899,#8b5cf6)",
                            ];
                            const grad = gradients[idx % gradients.length];
                            return (
                                <StaggerItem key={p.id}>
                                    <Card hoverable className="group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex h-11 w-11 items-center justify-center rounded-xl text-white text-sm font-bold shadow-md" style={{ background: grad }}>
                                                {p.name?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <Badge variant={p.is_active ? "recovering" : "normal"}>
                                                {p.is_active ? "In Treatment" : "Recovered"}
                                            </Badge>
                                        </div>
                                        <p className="font-semibold text-gray-900">{p.name}</p>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">{p.email}</p>
                                        {p.surgery_type && (
                                            <p className="mt-2 inline-block rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">{p.surgery_type}</p>
                                        )}
                                        <div className="mt-4 flex gap-2">
                                            <Link to={`/patients/${p.id}`} className="flex-1">
                                                <Button size="sm" variant="outline" className="w-full">
                                                    View Details
                                                </Button>
                                            </Link>
                                            <Button
                                                size="sm"
                                                variant={p.is_active ? "ghost" : "primary"}
                                                loading={toggleMut.isPending}
                                                onClick={() =>
                                                    toggleMut.mutate({ patientId: p.id, isActive: !p.is_active })
                                                }
                                                title={p.is_active ? "Mark as Recovered" : "Mark back In Treatment"}
                                            >
                                                {p.is_active ? "Recovered ✓" : "In Treatment"}
                                            </Button>
                                        </div>
                                    </Card>
                                </StaggerItem>
                            )
                        })}
                    </Stagger>
                ) : (
                    <Card className="py-16 text-center">
                        <p className="text-gray-500">No patients linked yet</p>
                        <Link to="/requests" className="mt-2 inline-block text-sm text-primary-500 hover:underline">
                            Send a connection request
                        </Link>
                    </Card>
                )}
            </div>
        </PageTransition>
    );
}

