import api from "./axios";
import type { ApiResponse, DoctorLink, MedicationInput, PatientWithStatus, RequestResponse, SafeUser } from "@/types";

export const requestApi = {
    sendRequest: (payload: {
        to_email?: string;
        connect_code?: string;
        specialty?: string;
        visit_date?: string;
        disease_description: string;
        medications: MedicationInput[];
    }) =>
        api
            .post<ApiResponse<RequestResponse>>("/requests", payload)
            .then((r) => r.data),

    getPending: () =>
        api
            .get<ApiResponse<RequestResponse[]>>("/requests/pending")
            .then((r) => r.data),

    acceptRequest: (id: string) =>
        api
            .post<ApiResponse<RequestResponse>>(`/requests/${id}/accept`)
            .then((r) => r.data),

    rejectRequest: (id: string) =>
        api
            .post<ApiResponse<RequestResponse>>(`/requests/${id}/reject`)
            .then((r) => r.data),

    /** Patient: get ALL linked doctors */
    getMyDoctors: () =>
        api
            .get<ApiResponse<DoctorLink[]>>("/requests/my-doctors")
            .then((r) => r.data),

    /** Doctor: get all linked patients (includes is_active + link_id) */
    getMyPatients: () =>
        api
            .get<ApiResponse<PatientWithStatus[]>>("/requests/my-patients")
            .then((r) => r.data),

    /** Look up a user by their 6-char connect code */
    lookupByCode: (code: string) =>
        api
            .get<ApiResponse<SafeUser>>(`/requests/lookup?code=${encodeURIComponent(code)}`)
            .then((r) => r.data),

    disconnect: (doctorId: string) =>
        api
            .delete<ApiResponse<null>>(`/requests/${doctorId}/disconnect`)
            .then((r) => r.data),
};
