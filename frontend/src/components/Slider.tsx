import { useId } from "react";
import { cn } from "@/lib/utils";

interface SliderProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (v: number) => void;
    lowLabel?: string;
    highLabel?: string;
    colorClass?: string;
}

export default function Slider({
    label,
    value,
    min = 1,
    max = 10,
    step = 1,
    onChange,
    lowLabel,
    highLabel,
    colorClass = "accent-primary-500",
}: SliderProps) {
    const id = useId();
    const pct = ((value - min) / (max - min)) * 100;

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <label htmlFor={id} className="text-sm font-medium text-gray-700">
                    {label}
                </label>
                <span className="min-w-[2rem] rounded-md bg-primary-50 px-2 py-0.5 text-center text-sm font-bold text-primary-600">{value}</span>
            </div>

            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={cn("w-full cursor-pointer rounded-full", colorClass)}
                style={{
                    background: `linear-gradient(to right, var(--slider-fill, #2563eb) ${pct}%, #e5e7eb ${pct}%)`,
                }}
            />

            {(lowLabel || highLabel) && (
                <div className="flex justify-between text-xs text-gray-400">
                    <span>{lowLabel}</span>
                    <span>{highLabel}</span>
                </div>
            )}
        </div>
    );
}
