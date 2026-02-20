import api from "./axios";
import type { ApiResponse, DoctorSummary, PatientInsight } from "@/types";

export const aiApi = {
    getPatientInsight: () =>
        api
            .get<ApiResponse<PatientInsight | null>>("/ai/insight")
            .then((r) => r.data),

    getDoctorSummary: (patientId: string) =>
        api
            .get<ApiResponse<DoctorSummary | null>>(`/ai/summary/${patientId}`)
            .then((r) => r.data),
};
