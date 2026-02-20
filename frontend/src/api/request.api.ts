import api from "./axios";
import type { ApiResponse, RequestResponse, SafeUser } from "@/types";

export const requestApi = {
    sendRequest: (to_email: string) =>
        api
            .post<ApiResponse<RequestResponse>>("/requests", { to_email })
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

    getMyDoctor: () =>
        api
            .get<ApiResponse<SafeUser | null>>("/requests/my-doctor")
            .then((r) => r.data),

    getMyPatients: () =>
        api
            .get<ApiResponse<SafeUser[]>>("/requests/my-patients")
            .then((r) => r.data),

    disconnect: (otherId: string) =>
        api
            .delete<ApiResponse<null>>(`/requests/${otherId}/disconnect`)
            .then((r) => r.data),
};
