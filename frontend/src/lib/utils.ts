import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely — the standard in production React + Tailwind codebases. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
