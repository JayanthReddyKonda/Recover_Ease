import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#eff6ff",
                    100: "#dbeafe",
                    200: "#bfdbfe",
                    300: "#93c5fd",
                    400: "#60a5fa",
                    500: "#3b82f6",
                    600: "#1a56db",
                    700: "#1d4ed8",
                    800: "#1e40af",
                    900: "#1e3a8a",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            borderRadius: {
                card: "0.875rem",
                pill: "9999px",
            },
            boxShadow: {
                card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
                "card-hover": "0 10px 30px rgba(0,0,0,0.12)",
                "glow-blue": "0 0 24px rgba(26,86,219,0.3)",
                "glow-red": "0 0 24px rgba(220,38,38,0.4)",
                "glow-green": "0 0 24px rgba(22,163,74,0.3)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
                float: "float 6s ease-in-out infinite",
                "wiggle": "wiggle 0.5s ease-in-out",
            },
            keyframes: {
                float: {
                    "0%,100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                wiggle: {
                    "0%,100%": { transform: "rotate(0deg)" },
                    "25%": { transform: "rotate(-12deg)" },
                    "75%": { transform: "rotate(12deg)" },
                },
            },
        },
    },
    plugins: [],
} satisfies Config;
