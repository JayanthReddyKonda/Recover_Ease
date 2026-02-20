import api from "./axios";
import type {
    ApiResponse,
    AuthResponse,
    LoginRequest,
    ProfileUpdateRequest,
    RegisterRequest,
    SafeUser,
} from "@/types";

export const authApi = {
    register: (data: RegisterRequest) =>
        api.post<ApiResponse<AuthResponse>>("/auth/register", data).then((r) => r.data),

    login: (data: LoginRequest) =>
        api.post<ApiResponse<AuthResponse>>("/auth/login", data).then((r) => r.data),

    getMe: () =>
        api.get<ApiResponse<SafeUser>>("/auth/me").then((r) => r.data),

    updateProfile: (data: ProfileUpdateRequest) =>
        api.patch<ApiResponse<SafeUser>>("/auth/profile", data).then((r) => r.data),
};
