import { useQuery } from "@tanstack/react-query";
import { requestApi } from "@/api/request.api";
import Card from "@/components/Card";
import Skeleton from "@/components/Skeleton";
import Button from "@/components/Button";
import { Link } from "react-router-dom";

export default function PatientsListPage() {
    const patients = useQuery({
        queryKey: ["my-patients"],
        queryFn: () => requestApi.getMyPatients().then((r) => r.data),
    });

    return (
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {patients.data.map((p) => (
                        <Card key={p.id} hoverable>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.email}</p>
                            {p.surgery_type && (
                                <p className="mt-1 text-xs text-gray-500">{p.surgery_type}</p>
                            )}
                            <Link to={`/patients/${p.id}`} className="mt-3 block">
                                <Button size="sm" variant="outline" className="w-full">
                                    View Details
                                </Button>
                            </Link>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="py-16 text-center">
                    <p className="text-gray-500">No patients linked yet</p>
                    <Link to="/requests" className="mt-2 inline-block text-sm text-primary-500 hover:underline">
                        Send a connection request
                    </Link>
                </Card>
            )}
        </div>
    );
}
