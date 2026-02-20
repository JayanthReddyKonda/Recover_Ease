import api from "./axios";
import type {
    ApiResponse,
    EscalationResponse,
    PatientFull,
    PatientProfile,
    ReviewEscalationRequest,
} from "@/types";

export const patientApi = {
    getMyProfile: () =>
        api
            .get<ApiResponse<PatientProfile>>("/patients/me/profile")
            .then((r) => r.data),

    getFullPatient: (id: string) =>
        api
            .get<ApiResponse<PatientFull>>(`/patients/${id}/full`)
            .then((r) => r.data),

    triggerSOS: (notes?: string) =>
        api
            .post<ApiResponse<EscalationResponse>>("/patients/sos", { notes })
            .then((r) => r.data),

    reviewEscalation: (id: string, data: ReviewEscalationRequest) =>
        api
            .patch<ApiResponse<EscalationResponse>>(
                `/patients/escalations/${id}`,
                data,
            )
            .then((r) => r.data),

    /** Doctor marks a patient as recovered (false) or back in treatment (true) */
    setTreatmentStatus: (patientId: string, isActive: boolean) =>
        api
            .patch<ApiResponse<null>>(`/patients/${patientId}/treatment-status`, {
                is_active: isActive,
            })
            .then((r) => r.data),

    /** Doctor sets surgery type + date on a patient's profile */
    updateSurgeryDetails: (patientId: string, surgery_type: string | null, surgery_date: string | null) =>
        api
            .patch<ApiResponse<null>>(`/patients/${patientId}/surgery-details`, {
                surgery_type: surgery_type || null,
                surgery_date: surgery_date || null,
            })
            .then((r) => r.data),
};
