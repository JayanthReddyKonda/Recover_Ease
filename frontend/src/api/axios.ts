import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 15000,
    headers: { "Content-Type": "application/json" },
});

// Inject Bearer token on every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("rc_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                localStorage.removeItem("rc_token");
                window.location.href = "/login";
                return Promise.reject(error);
            }
            // Surface backend error message
            const msg =
                error.response?.data?.error ||
                error.response?.data?.detail ||
                error.message;
            return Promise.reject(new Error(msg));
        }
        if (error.request && !error.response) {
            return Promise.reject(
                new Error("Cannot connect to server. Is the backend running?"),
            );
        }
        return Promise.reject(error);
    },
);

export default api;
