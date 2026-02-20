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
import { ArrowLeft, Heart, LogIn } from "lucide-react";

const schema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;
const ease = [0.25, 0.1, 0.25, 1] as const;

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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4">
            <div className="pointer-events-none absolute -top-32 -left-32 h-[400px] w-[400px] rounded-full bg-primary-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full bg-blue-300/15 blur-3xl" />

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
                className="relative z-10 w-full max-w-[420px]"
            >
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-glow-sm">
                        <Heart className="h-6 w-6 fill-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                        <p className="mt-1 text-sm text-gray-500">Log in to your Recovery Companion account</p>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 sm:p-8">
                    <form
                        onSubmit={handleSubmit((d) => mutation.mutate(d))}
                        className="flex flex-col gap-4"
                    >
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            {...register("email")}
                            error={errors.email?.message}
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            {...register("password")}
                            error={errors.password?.message}
                        />

                        <Button type="submit" loading={mutation.isPending} className="mt-2 w-full">
                            <LogIn className="h-4 w-4" /> Log In
                        </Button>
                    </form>
                </div>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Don&apos;t have an account?{" "}
                    <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                        Sign up
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
