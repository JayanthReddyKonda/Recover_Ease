import { useQuery } from "@tanstack/react-query";
import { patientApi } from "@/api/patient.api";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import { PageTransition, Stagger, StaggerItem } from "@/components/motion";
import { Trophy, Target } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function MilestonesPage() {
    const profile = useQuery({
        queryKey: ["patient-profile"],
        queryFn: () => patientApi.getMyProfile().then((r) => r.data),
    });

    const milestones = profile.data?.milestones ?? [];

    return (
        <PageTransition>
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <h1 className="page-heading">Milestones</h1>
                </div>

                {profile.isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}><Skeleton lines={3} /></Card>
                        ))}
                    </div>
                ) : milestones.length > 0 ? (
                    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {milestones.map((m) => (
                            <StaggerItem key={m.id}>
                                <Card hoverable className="text-center">
                                    <span className="text-4xl">{m.icon}</span>
                                    <p className="mt-2 font-bold text-gray-900">{m.title}</p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Earned {format(parseISO(m.earned_at), "MMM d, yyyy")}
                                    </p>
                                </Card>
                            </StaggerItem>
                        ))}
                    </Stagger>
                ) : (
                    <Card className="py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
                            <Target className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="mt-4 font-medium text-gray-600">
                            No milestones yet
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                            Keep logging your symptoms to unlock achievements!
                        </p>
                    </Card>
                )}
            </div>
        </PageTransition>
    );
}
