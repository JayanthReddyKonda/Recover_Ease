import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    200: "#c7d2fe",
                    300: "#a5b4fc",
                    400: "#818cf8",
                    500: "#6366f1",
                    600: "#4f46e5",
                    700: "#4338ca",
                    800: "#3730a3",
                    900: "#312e81",
                    950: "#1e1b4b",
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
                navy: {
                    950: "#080d1a",
                    900: "#0d1117",
                    800: "#111827",
                    700: "#1a2236",
                    600: "#1e2d50",
                    500: "#253361",
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
                "5xl": "2.5rem",
            },
            boxShadow: {
                xs: "0 1px 2px 0 rgb(0 0 0 / 0.03)",
                soft: "0 2px 8px -2px rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.03)",
                card: "0 1px 4px rgb(0 0 0 / 0.05), 0 1px 2px rgb(0 0 0 / 0.03)",
                "card-hover": "0 12px 40px rgb(0 0 0 / 0.10), 0 4px 12px rgb(0 0 0 / 0.06)",
                "glow-sm": "0 0 14px rgb(79 70 229 / 0.35)",
                "glow-md": "0 0 28px rgb(79 70 229 / 0.40)",
                "glow-lg": "0 0 48px rgb(79 70 229 / 0.30)",
                "glow-red": "0 0 28px rgb(220 38 38 / 0.45)",
                "glow-green": "0 0 18px rgb(22 163 74 / 0.40)",
                "glow-purple": "0 0 26px rgb(139 92 246 / 0.40)",
                "glow-amber": "0 0 20px rgb(245 158 11 / 0.40)",
                float: "0 24px 64px -12px rgb(0 0 0 / 0.18)",
                "inner-sm": "inset 0 1px 2px rgb(0 0 0 / 0.06)",
                lifted: "0 4px 16px -2px rgb(79 70 229 / 0.25), 0 1px 4px rgb(0 0 0 / 0.06)",
            },
            animation: {
                shimmer: "shimmer 2s infinite linear",
                "pulse-soft": "pulseSoft 3s infinite ease-in-out",
                float: "float 6s ease-in-out infinite",
                "glow-pulse": "glowPulse 2.5s ease-in-out infinite",
                "slide-up": "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                "fade-in": "fadeIn 0.3s ease forwards",
                "scale-in": "scaleIn 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards",
                "spin-slow": "spin 8s linear infinite",
                blob: "blob 12s ease-in-out infinite",
                "blob-delay": "blob 14s ease-in-out 3s infinite",
                "progress-in": "progressIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards",
            },
            keyframes: {
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                pulseSoft: {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.65" },
                },
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                glowPulse: {
                    "0%, 100%": { boxShadow: "0 0 12px rgb(79 70 229 / 0.3)" },
                    "50%": { boxShadow: "0 0 32px rgb(79 70 229 / 0.65)" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(18px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.90)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
                blob: {
                    "0%, 100%": { borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%", transform: "rotate(0deg) scale(1)" },
                    "33%": { borderRadius: "40% 60% 30% 70% / 60% 40% 60% 40%", transform: "rotate(120deg) scale(1.05)" },
                    "66%": { borderRadius: "70% 30% 50% 50% / 30% 70% 50% 50%", transform: "rotate(240deg) scale(0.95)" },
                },
                progressIn: {
                    "0%": { width: "0%" },
                    "100%": { width: "var(--progress-width, 70%)" },
                },
            },
            transitionTimingFunction: {
                spring: "cubic-bezier(0.22, 1, 0.36, 1)",
                expo: "cubic-bezier(0.16, 1, 0.3, 1)",
                bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "mesh-primary": "radial-gradient(at 40% 20%, rgb(99 102 241 / 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, rgb(139 92 246 / 0.12) 0px, transparent 50%), radial-gradient(at 0% 50%, rgb(79 70 229 / 0.08) 0px, transparent 50%)",
            },
        },
    },
    plugins: [],
} satisfies Config;
