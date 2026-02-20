import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Badge from "@/components/Badge";
import MetricCard from "@/components/MetricCard";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
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
        <PageTransition>
            <div className="space-y-6">
                {/* ── Hero Header ── */}
                <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4f46e5 100%)", boxShadow: "0 8px 32px rgb(79 70 229 / 0.25)" }}>
                    <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", filter: "blur(20px)" }} />
                    <div className="absolute right-6 bottom-0 h-24 w-24 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)", filter: "blur(16px)" }} />
                    <div className="relative flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-1">Welcome back</p>
                            <h1 className="text-2xl font-extrabold tracking-tight">Dr. {user?.name?.split(" ").pop()}</h1>
                            <p className="mt-1 text-sm text-white/55">
                                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                            </p>
                        </div>
                        <Link to="/requests">
                            <button className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white/80 transition-all hover:text-white hover:bg-white/10 border border-white/15">
                                <UserPlus className="h-4 w-4" /> Manage Requests
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Metrics */}
                <Stagger className="grid gap-4 sm:grid-cols-3">
                    <StaggerItem>
                        <MetricCard
                            icon={<Users className="h-5 w-5" />}
                            label="Active Patients"
                            value={patients.data?.length ?? "—"}
                        />
                    </StaggerItem>
                    <StaggerItem>
                        <MetricCard
                            icon={<Bell className="h-5 w-5" />}
                            label="Pending Requests"
                            value={pending.data?.length ?? "—"}
                        />
                    </StaggerItem>
                    <StaggerItem>
                        <MetricCard
                            icon={<AlertTriangle className="h-5 w-5" />}
                            label="Needs Attention"
                            value="—"
                            sub="Open escalations shown per patient"
                        />
                    </StaggerItem>
                </Stagger>

                {/* Pending requests preview */}
                {pending.data && pending.data.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="section-heading">Pending Requests</h2>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{pending.data.length}</span>
                        </div>
                        <ul className="space-y-2">
                            {pending.data.slice(0, 5).map((r) => (
                                <li key={r.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition-colors hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 text-sm font-bold">
                                            {r.from_user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{r.from_user?.name ?? r.from_id}</p>
                                            <p className="text-xs text-gray-400">{r.from_user?.email}</p>
                                        </div>
                                    </div>
                                    <Badge variant="pending">Pending</Badge>
                                </li>
                            ))}
                        </ul>
                        {pending.data.length > 5 && (
                            <Link to="/requests" className="mt-3 block text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline">
                                View all {pending.data.length} requests →
                            </Link>
                        )}
                    </Card>
                )}

                {/* Patients list */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="section-heading">Your Patients</h2>
                        {patients.data && patients.data.length > 0 && (
                            <Link to="/patients">
                                <button className="text-xs font-medium text-primary-500 hover:text-primary-600 hover:underline transition-colors">View all →</button>
                            </Link>
                        )}
                    </div>
                    {patients.isLoading ? (
                        <Skeleton lines={5} />
                    ) : patients.data && patients.data.length > 0 ? (
                        <ul className="space-y-1.5">
                            {patients.data.map((p) => (
                                <li key={p.id} className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-gray-50/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)" }}>
                                            {p.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                                            <p className="text-xs text-gray-400">{p.email}</p>
                                        </div>
                                    </div>
                                    <Link to={`/patients/${p.id}`}>
                                        <Button variant="ghost" size="sm" className="text-primary-500 hover:text-primary-600 hover:bg-primary-50">View →</Button>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                                <Users className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-500">No patients linked yet</p>
                            <p className="mt-1 text-xs text-gray-400">Send a connection request to get started</p>
                        </div>
                    )}
                </Card>
            </div>
        </PageTransition>
    );
}
