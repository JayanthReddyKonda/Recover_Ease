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
import type { Role } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["PATIENT", "DOCTOR"]),
  surgery_type: z.string().optional(),
  surgery_date: z.string().optional(),
  caregiver_email: z.string().email("Invalid email").optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-primary px-4">
      <div className="card w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-primary-600">
          <Heart className="h-6 w-6 fill-primary-500" />
          <span className="text-lg font-bold">Create Account</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Full Name" {...register("name")} error={errors.name?.message} />
          <Input label="Email" type="email" {...register("email")} error={errors.email?.message} />
          <Input label="Password" type="password" {...register("password")} error={errors.password?.message} />

          {/* Role selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700">I am a</span>
            <div className="flex gap-2">
              {(["PATIENT", "DOCTOR"] as const).map((r) => (
                <label
                  key={r}
                  className={`flex-1 cursor-pointer rounded-lg border px-4 py-2 text-center text-sm font-medium transition-colors ${
                    role === r
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <input type="radio" value={r} {...register("role")} className="sr-only" />
                  {r === "PATIENT" ? "Patient" : "Doctor"}
                </label>
              ))}
            </div>
          </div>

          {/* Patient-only fields */}
          {role === "PATIENT" && (
            <>
              <Input label="Surgery Type" placeholder="e.g. Knee replacement" {...register("surgery_type")} />
              <Input label="Surgery Date" type="date" {...register("surgery_date")} />
              <Input
                label="Caregiver Email (optional)"
                type="email"
                {...register("caregiver_email")}
                error={errors.caregiver_email?.message}
              />
            </>
          )}

          <Button type="submit" loading={mutation.isPending} className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
