import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { format, parseISO } from "date-fns";

export default function MilestonesPage() {
    const profile = useQuery({
        queryKey: ["patient-profile"],
        queryFn: () => patientApi.getMyProfile().then((r) => r.data),
    });

    const milestones = profile.data?.milestones ?? [];

    return (
        <div className="space-y-6">
            <h1 className="page-heading">🏆 Milestones</h1>

            {profile.isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}><Skeleton lines={3} /></Card>
                    ))}
                </div>
            ) : milestones.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {milestones.map((m) => (
                        <Card key={m.id} className="text-center">
                            <span className="text-4xl">{m.icon}</span>
                            <p className="mt-2 font-semibold">{m.title}</p>
                            <p className="mt-1 text-xs text-gray-400">
                                Earned {format(parseISO(m.earned_at), "MMM d, yyyy")}
                            </p>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <span className="text-5xl">🎯</span>
                    <p className="mt-3 text-gray-500">
                        No milestones yet — keep logging to unlock them!
                    </p>
                </Card>
            )}
        </div>
    );
}
