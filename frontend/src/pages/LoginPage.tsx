import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { useStore } from "@/store/useStore";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Heart } from "lucide-react";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary px-4">
      <div className="card w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2 text-primary-600">
          <Heart className="h-6 w-6 fill-primary-500" />
          <span className="text-lg font-bold">Log In</span>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutation.mutate(d))}
          className="flex flex-col gap-4"
        >
          <Input
            label="Email"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label="Password"
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />

          <Button type="submit" loading={mutation.isPending} className="mt-2">
            Log In
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="font-medium text-primary-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
