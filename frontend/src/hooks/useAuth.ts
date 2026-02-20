import { useEffect, useState } from "react";
import { authApi } from "@/api/auth.api";
import { useStore } from "@/store/useStore";

/**
 * Bootstrap hook – calls GET /auth/me on mount if a token exists.
 * Returns auth state consumed by the rest of the app.
 */
export function useAuth() {
    const { user, token, setUser, logout } = useStore();
    const [isLoading, setIsLoading] = useState(!!token);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        let cancelled = false;

        authApi
            .getMe()
            .then((res) => {
                if (!cancelled && res.data) {
                    setUser(res.data);
                }
            })
            .catch(() => {
                if (!cancelled) logout();
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // Only run once on mount (or if token reference changes)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    return {
        user,
        isLoading,
        isAuthenticated: !!user && !!token,
        logout,
    };
}
