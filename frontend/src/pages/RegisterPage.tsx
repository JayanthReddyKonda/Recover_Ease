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
import { ArrowLeft, Heart, UserPlus, Stethoscope, User } from "lucide-react";
import type { Role } from "@/types";

const schema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Min 8 characters"),
    role: z.enum(["PATIENT", "DOCTOR"]),
    surgery_type: z.string().optional(),
    surgery_date: z.string().optional(),
    caregiver_email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;
const ease = [0.25, 0.1, 0.25, 1] as const;

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
            caregiver_email: data.caregiver_email || undefined,
            surgery_date: data.surgery_date || undefined,
            surgery_type: data.surgery_type || undefined,
        });
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-12">
            <div className="pointer-events-none absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full bg-primary-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -left-32 h-[350px] w-[350px] rounded-full bg-blue-300/15 blur-3xl" />

            {/* Back to home */}
            <Link
                to="/"
                className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-2 text-sm font-medium text-gray-600 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-gray-900 hover:shadow-md sm:left-6 sm:top-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Home
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
                className="relative z-10 w-full max-w-[460px]"
            >
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-glow-sm">
                        <Heart className="h-6 w-6 fill-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
                        <p className="mt-1 text-sm text-gray-500">Join Recovery Companion and start your journey</p>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 sm:p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                        <Input label="Full Name" placeholder="John Doe" {...register("name")} error={errors.name?.message} />
                        <Input label="Email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} />
                        <Input label="Password" type="password" placeholder="Min 8 characters" {...register("password")} error={errors.password?.message} />

                        <div className="flex flex-col gap-2">
                            <span className="text-[13px] font-medium text-gray-700">I am a</span>
                            <div className="grid grid-cols-2 gap-3">
                                {([
                                    { value: "PATIENT", label: "Patient", icon: <User className="h-4 w-4" /> },
                                    { value: "DOCTOR", label: "Doctor", icon: <Stethoscope className="h-4 w-4" /> },
                                ] as const).map((r) => (
                                    <label
                                        key={r.value}
                                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 ${role === r.value
                                            ? "border-primary-500 bg-primary-50 text-primary-700 shadow-sm"
                                            : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
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
                                className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4"
                            >
                                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Surgery Details (optional)</p>
                                <Input label="Surgery Type" placeholder="e.g. Knee replacement" {...register("surgery_type")} />
                                <Input label="Surgery Date" type="date" {...register("surgery_date")} />
                                <Input
                                    label="Caregiver Email"
                                    type="email"
                                    placeholder="caregiver@example.com"
                                    {...register("caregiver_email")}
                                    error={errors.caregiver_email?.message}
                                />
                            </motion.div>
                        )}

                        <Button type="submit" loading={mutation.isPending} className="mt-2 w-full">
                            <UserPlus className="h-4 w-4" /> Create Account
                        </Button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                        Log in
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
