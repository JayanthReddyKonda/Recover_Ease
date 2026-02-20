import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { authApi } from "@/api/auth.api";
import { useStore } from "@/store/useStore";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { ArrowLeft, Heart, LogIn, Activity, Brain, Shield } from "lucide-react";

const schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;
const ease = [0.22, 1, 0.36, 1] as const;

const highlights = [
    { icon: <Activity className="h-4 w-4" />, text: "Daily symptom tracking" },
    { icon: <Brain className="h-4 w-4" />, text: "AI-powered insights" },
    { icon: <Shield className="h-4 w-4" />, text: "Secure & encrypted" },
];

export default function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useStore((s) => s.setAuth);
    const addToast = useStore((s) => s.addToast);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const mutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (res) => {
            if (res.data) {
                setAuth(res.data.user, res.data.token);
                addToast("success", "Welcome back!", `Logged in as ${res.data.user.name}`);
                navigate("/dashboard");
            }
        },
        onError: (err: Error) => addToast("error", "Login failed", err.message),
    });

    return (
        <div className="flex min-h-screen" style={{ background: "#0d1117" }}>
            {/* ── Left branded panel (desktop) ── */}
            <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 30%, #4338ca 65%, #6366f1 100%)" }}>
                {/* Background blobs */}
                <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", filter: "blur(40px)" }} />
                <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)", filter: "blur(40px)" }} />
                {/* Grid overlay */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                <div className="relative">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                            <Heart className="h-5 w-5 fill-white text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">RecoverEase</span>
                    </div>
                </div>

                <div className="relative">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease }}
                        className="text-4xl font-black text-white leading-[1.15] tracking-tight"
                    >
                        Your health,<br />beautifully tracked.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease }}
                        className="mt-4 text-base text-white/60 leading-relaxed"
                    >
                        Monitor your recovery journey with AI insights and stay connected with your care team.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2, ease }}
                        className="mt-8 space-y-3"
                    >
                        {highlights.map((h, i) => (
                            <div key={i} className="flex items-center gap-3 text-white/70">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                                    {h.icon}
                                </div>
                                <span className="text-sm font-medium">{h.text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                <div className="relative">
                    <p className="text-xs text-white/30">© {new Date().getFullYear()} RecoverEase</p>
                </div>
            </div>

            {/* ── Right: form panel ── */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
                {/* Back to home */}
                <Link
                    to="/"
                    className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white/50 transition-all hover:text-white/80 lg:hidden"
                >
                    <ArrowLeft className="h-4 w-4" /> Home
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease }}
                    className="w-full max-w-[400px]"
                >
                    {/* Logo for mobile */}
                    <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl lg:hidden" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 24px rgb(99 102 241 / 0.4)" }}>
                            <Heart className="h-5 w-5 fill-white text-white" />
                        </div>
                        <div className="text-center lg:text-left">
                            <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
                            <p className="mt-1 text-sm text-white/45">Sign in to your account</p>
                        </div>
                    </div>

                    <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <form
                            onSubmit={handleSubmit((d) => mutation.mutate(d))}
                            className="flex flex-col gap-4"
                        >
                            <Input
                                label="Email"
                                type="email"
                                placeholder="you@example.com"
                                dark
                                {...register("email")}
                                error={errors.email?.message}
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                dark
                                {...register("password")}
                                error={errors.password?.message}
                            />

                            <Button type="submit" loading={mutation.isPending} className="mt-2 w-full">
                                <LogIn className="h-4 w-4" /> Sign In
                            </Button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-white/40">
                        Don&apos;t have an account?{" "}
                        <Link to="/register" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                            Sign up free
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
