import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    dark?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, id, dark = false, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            "text-[13px] font-medium",
                            dark ? "text-white/60" : "text-gray-700"
                        )}
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        dark
                            ? "w-full rounded-xl border px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-0 transition-all duration-200 focus:ring-2"
                            : "input-base",
                        dark && "border-white/10 bg-white/5 focus:border-primary-500/60 focus:ring-primary-500/20",
                        dark && error && "border-red-500/40",
                        !dark && error && "border-red-300 focus:border-red-400 focus:ring-red-500/20",
                        className,
                    )}
                    {...props}
                />
                {error && (
                    <p className={cn("text-xs", dark ? "text-red-400" : "text-red-500")}>{error}</p>
                )}
            </div>
        );
    },
);

Input.displayName = "Input";

export default Input;

