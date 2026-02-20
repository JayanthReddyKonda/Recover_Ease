import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import MetricCard from "@/components/MetricCard";
import { Users, AlertTriangle, Bell, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "@/components/Button";

export default function DoctorDashboard() {
    const { user } = useAuth();

    const patients = useQuery({
        queryKey: ["my-patients"],
        queryFn: () => requestApi.getMyPatients().then((r) => r.data),
    });

    const pending = useQuery({
        queryKey: ["pending-requests"],
        queryFn: () => requestApi.getPending().then((r) => r.data),
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-heading">
                        Welcome, Dr. {user?.name?.split(" ").pop()} 👋
                    </h1>
                    <p className="text-sm text-gray-500">
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </p>
                </div>
                <Link to="/requests">
                    <Button variant="outline" size="sm">
                        <UserPlus className="mr-1 h-4 w-4 inline" /> Manage Requests
                    </Button>
                </Link>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                    icon={<Users className="h-5 w-5" />}
                    label="Active Patients"
                    value={patients.data?.length ?? "—"}
                />
                <MetricCard
                    icon={<Bell className="h-5 w-5" />}
                    label="Pending Requests"
                    value={pending.data?.length ?? "—"}
                />
                <MetricCard
                    icon={<AlertTriangle className="h-5 w-5" />}
                    label="Needs Attention"
                    value="—"
                    sub="Open escalations shown per patient"
                />
            </div>

            {/* Pending requests preview */}
            {pending.data && pending.data.length > 0 && (
                <Card>
                    <h2 className="section-heading mb-3">Pending Requests</h2>
                    <ul className="space-y-2">
                        {pending.data.slice(0, 5).map((r) => (
                            <li key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div>
                                    <p className="text-sm font-medium">{r.from_user?.name ?? r.from_id}</p>
                                    <p className="text-xs text-gray-400">{r.from_user?.email}</p>
                                </div>
                                <Badge variant="pending">Pending</Badge>
                            </li>
                        ))}
                    </ul>
                    {pending.data.length > 5 && (
                        <Link to="/requests" className="mt-2 block text-xs text-primary-500 hover:underline">
                            View all {pending.data.length} requests →
                        </Link>
                    )}
                </Card>
            )}

            {/* Patients list */}
            <Card>
                <h2 className="section-heading mb-3">Your Patients</h2>
                {patients.isLoading ? (
                    <Skeleton lines={5} />
                ) : patients.data && patients.data.length > 0 ? (
                    <ul className="divide-y">
                        {patients.data.map((p) => (
                            <li key={p.id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className="text-xs text-gray-400">{p.email}</p>
                                </div>
                                <Link to={`/patients/${p.id}`}>
                                    <Button variant="ghost" size="sm">View</Button>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="py-8 text-center text-sm text-gray-400">
                        No patients linked yet. Send a connection request to get started.
                    </p>
                )}
            </Card>
        </div>
    );
}
