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
import { ArrowLeft, Heart, UserPlus, Stethoscope, User, Smartphone } from "lucide-react";
import type { Role } from "@/types";

const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Min 8 characters"),
    role: z.enum(["PATIENT", "DOCTOR"]),
    whatsapp_phone: z
        .string()
        .regex(/^\+[1-9]\d{6,19}$/, "E.164 format required, e.g. +919876543210")
        .optional()
        .or(z.literal("")),
    caregiver_email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;
const ease = [0.22, 1, 0.36, 1] as const;

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useStore((s) => s.setAuth);
    const addToast = useStore((s) => s.addToast);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { role: "PATIENT" },
    });

    const role = watch("role");

    const mutation = useMutation({
        mutationFn: authApi.register,
        onSuccess: (res) => {
            if (res.data) {
                setAuth(res.data.user, res.data.token);
                addToast("success", "Welcome!", `Signed up as ${res.data.user.name}`);
                navigate("/dashboard");
            }
        },
        onError: (err: Error) => addToast("error", "Registration failed", err.message),
    });

    const onSubmit = (data: FormData) => {
        mutation.mutate({
            ...data,
            role: data.role as Role,
            whatsapp_phone: data.whatsapp_phone || undefined,
            caregiver_email: data.caregiver_email || undefined,
        });
    };

    return (
        <div className="flex min-h-screen" style={{ background: "#0d1117" }}>
            {/* ── Left branded panel ── */}
            <div className="hidden lg:flex lg:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "linear-gradient(145deg, #1e1b4b 0%, #312e81 30%, #4338ca 65%, #6366f1 100%)" }}>
                <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-20" style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", filter: "blur(40px)" }} />
                <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full opacity-15" style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)", filter: "blur(40px)" }} />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                <div className="relative flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                        <Heart className="h-4.5 w-4.5 fill-white text-white" />
                    </div>
                    <span className="text-base font-bold text-white">RecoverEase</span>
                </div>

                <div className="relative">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease }}
                        className="text-3xl font-black text-white leading-[1.2] tracking-tight"
                    >
                        Start your recovery<br />journey today.
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.12, ease }}
                        className="mt-3 text-sm text-white/55 leading-relaxed"
                    >
                        Join thousands of patients and doctors who use RecoverEase to stay connected and track progress.
                    </motion.p>
                </div>

                <p className="relative text-xs text-white/30">© {new Date().getFullYear()} RecoverEase</p>
            </div>

            {/* ── Right: form panel ── */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 lg:px-14 overflow-y-auto">
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
                    className="w-full max-w-[440px]"
                >
                    <div className="mb-7 flex flex-col items-center gap-3 lg:items-start">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl lg:hidden" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 24px rgb(99 102 241 / 0.4)" }}>
                            <Heart className="h-5 w-5 fill-white text-white" />
                        </div>
                        <div className="text-center lg:text-left">
                            <h1 className="text-2xl font-extrabold text-white">Create your account</h1>
                            <p className="mt-1 text-sm text-white/45">Join RecoverEase and start your journey</p>
                        </div>
                    </div>

                    <div className="rounded-2xl p-7" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                            <Input label="Full Name" placeholder="John Doe" dark {...register("name")} error={errors.name?.message} />
                            <Input label="Email" type="email" placeholder="you@example.com" dark {...register("email")} error={errors.email?.message} />
                            <Input label="Password" type="password" placeholder="Min 8 characters" dark {...register("password")} error={errors.password?.message} />

                            <div className="flex flex-col gap-2">
                                <span className="text-[13px] font-medium text-white/60">I am a</span>
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { value: "PATIENT", label: "Patient", icon: <User className="h-4 w-4" /> },
                                        { value: "DOCTOR", label: "Doctor", icon: <Stethoscope className="h-4 w-4" /> },
                                    ] as const).map((r) => (
                                        <label
                                            key={r.value}
                                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${role === r.value
                                                ? "border-primary-500/60 text-primary-300"
                                                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                                                }`}
                                            style={role === r.value ? { background: "rgba(99,102,241,0.15)" } : { background: "rgba(255,255,255,0.03)" }}
                                        >
                                            <input type="radio" value={r.value} {...register("role")} className="sr-only" />
                                            {r.icon}
                                            {r.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {role === "PATIENT" && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25, ease }}
                                    className="space-y-3 rounded-xl p-4"
                                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                                >
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-white/30">Caregiver (optional)</p>
                                    <Input
                                        label="Caregiver Email"
                                        type="email"
                                        placeholder="caregiver@example.com"
                                        dark
                                        {...register("caregiver_email")}
                                        error={errors.caregiver_email?.message}
                                    />
                                </motion.div>
                            )}

                            {/* WhatsApp number — both patients and doctors */}
                            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                                <div className="flex items-center gap-1.5">
                                    <Smartphone className="h-3.5 w-3.5 text-green-400" />
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-green-400/70">
                                        WhatsApp (optional)
                                    </span>
                                </div>
                                <p className="text-[11px] text-white/35">
                                    {role === "PATIENT"
                                        ? "Log symptoms by texting the bot — no app needed."
                                        : "Receive instant WhatsApp alerts when a patient escalates."}
                                    {" "}Format: <span className="text-white/50">+919876543210</span>
                                </p>
                                <Input
                                    label="Phone Number"
                                    placeholder="+919876543210"
                                    dark
                                    {...register("whatsapp_phone")}
                                    error={errors.whatsapp_phone?.message}
                                />
                            </div>

                            <Button type="submit" loading={mutation.isPending} className="mt-2 w-full">
                                <UserPlus className="h-4 w-4" /> Create Account
                            </Button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-white/40">
                        Already have an account?{" "}
                        <Link to="/login" className="font-semibold text-primary-400 hover:text-primary-300 transition-colors">
                            Log in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}