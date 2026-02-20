import api from "./axios";
import type {
    ApiResponse,
    CarePlan,
    CreateTaskBody,
    RecoveryTask,
    UpdateCarePlanBody,
    UpdateTaskBody,
} from "@/types";

export const carePlanApi = {
    // ── Doctor ──────────────────────────────────────────

    /** Get current care plan for a patient */
    getCarePlan: (patientId: string) =>
        api
            .get<ApiResponse<CarePlan>>(`/care-plan/${patientId}`)
            .then((r) => r.data),

    /** Update prescription, expected recovery date, duration */
    updateCarePlan: (patientId: string, body: UpdateCarePlanBody) =>
        api
            .put<ApiResponse<CarePlan>>(`/care-plan/${patientId}`, body)
            .then((r) => r.data),

    /** List all tasks the doctor created for a patient */
    listDoctorTasks: (patientId: string) =>
        api
            .get<ApiResponse<RecoveryTask[]>>(`/care-plan/${patientId}/tasks`)
            .then((r) => r.data),

    /** Create a recovery task */
    createTask: (patientId: string, body: CreateTaskBody) =>
        api
            .post<ApiResponse<RecoveryTask>>(`/care-plan/${patientId}/tasks`, body)
            .then((r) => r.data),

    /** Edit a task */
    updateTask: (patientId: string, taskId: string, body: UpdateTaskBody) =>
        api
            .put<ApiResponse<RecoveryTask>>(`/care-plan/${patientId}/tasks/${taskId}`, body)
            .then((r) => r.data),

    /** Delete a task */
    deleteTask: (patientId: string, taskId: string) =>
        api
            .delete<ApiResponse<null>>(`/care-plan/${patientId}/tasks/${taskId}`)
            .then((r) => r.data),

    // ── Patient ─────────────────────────────────────────

    /** Patient gets all care plans from their doctors */
    getMyPlans: () =>
        api
            .get<ApiResponse<CarePlan[]>>("/care-plan/my/plans")
            .then((r) => r.data),

    /** Patient gets their tasks */
    getMyTasks: () =>
        api
            .get<ApiResponse<RecoveryTask[]>>("/care-plan/my/tasks")
            .then((r) => r.data),

    /** Patient marks a task complete */
    completeTask: (taskId: string, completion_note?: string) =>
        api
            .post<ApiResponse<RecoveryTask>>(`/care-plan/my/tasks/${taskId}/complete`, {
                completion_note,
            })
            .then((r) => r.data),

    /** Patient un-marks a task */
    undoTask: (taskId: string) =>
        api
            .post<ApiResponse<RecoveryTask>>(`/care-plan/my/tasks/${taskId}/undo`, {})
            .then((r) => r.data),
};
