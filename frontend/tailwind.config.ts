import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#f0f5ff",
                    100: "#e0ebff",
                    200: "#c7d9fd",
                    300: "#a4bffa",
                    400: "#7c9cf5",
                    500: "#5a7dee",
                    600: "#3d5ce3",
                    700: "#3149c8",
                    800: "#2c3fa2",
                    900: "#293980",
                    950: "#1b244f",
                },
                gray: {
                    50: "#f8f9fb",
                    100: "#f1f3f5",
                    200: "#e5e7ec",
                    300: "#d1d5dc",
                    400: "#9ca3b0",
                    500: "#6b7280",
                    600: "#4b5563",
                    700: "#374151",
                    800: "#1f2937",
                    900: "#111827",
                    950: "#0b0f19",
                },
            },
            fontFamily: {
                sans: [
                    "Inter",
                    "ui-sans-serif",
                    "system-ui",
                    "-apple-system",
                    "sans-serif",
                ],
            },
            fontSize: {
                "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
            },
            borderRadius: {
                "4xl": "2rem",
            },
            boxShadow: {
                xs: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
                soft: "0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
                card: "0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.02)",
                "card-hover":
                    "0 8px 30px rgb(0 0 0 / 0.08), 0 2px 8px rgb(0 0 0 / 0.04)",
                "glow-sm": "0 0 12px rgb(61 92 227 / 0.25)",
                "glow-md": "0 0 24px rgb(61 92 227 / 0.3)",
                "glow-red": "0 0 24px rgb(220 38 38 / 0.35)",
                "glow-green": "0 0 16px rgb(22 163 74 / 0.3)",
                float: "0 20px 60px -12px rgb(0 0 0 / 0.15)",
            },
            animation: {
                shimmer: "shimmer 2s infinite linear",
                "pulse-soft": "pulseSoft 3s infinite ease-in-out",
                float: "float 6s ease-in-out infinite",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
            },
            transitionTimingFunction: {
                spring: "cubic-bezier(0.25, 0.1, 0.25, 1.05)",
            },
        },
    },
    plugins: [],
} satisfies Config;
