import api from "./axios";
import type {
    ApiResponse,
    LogSymptomRequest,
    SymptomLogResponse,
    SymptomSummary,
    SymptomTrendPoint,
} from "@/types";

export const symptomApi = {
    logSymptom: (data: LogSymptomRequest) =>
        api
            .post<ApiResponse<SymptomLogResponse>>("/symptoms", data)
            .then((r) => r.data),

    getLogs: (limit = 30, offset = 0) =>
        api
            .get<ApiResponse<SymptomLogResponse[]>>("/symptoms", {
                params: { limit, offset },
            })
            .then((r) => r.data),

    getTodayLog: () =>
        api
            .get<ApiResponse<SymptomLogResponse | null>>("/symptoms/today")
            .then((r) => r.data),

    getSummary: () =>
        api
            .get<ApiResponse<SymptomSummary>>("/symptoms/summary")
            .then((r) => r.data),

    getTrend: (days = 14) =>
        api
            .get<ApiResponse<SymptomTrendPoint[]>>("/symptoms/trend", {
                params: { days },
            })
            .then((r) => r.data),
};
