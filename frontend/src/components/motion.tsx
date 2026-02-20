import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

/* ───────────────── Easing ───────────────── */
const ease = [0.25, 0.1, 0.25, 1] as const;

/* ───────────────── Page transition (wrap each page) ───────────── */
export function PageTransition({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
        >
            {children}
        </motion.div>
    );
}

/* ───────────────── Stagger container ───────────────── */
const staggerParent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } },
};

export function Stagger({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ───────────────── Stagger child item ───────────────── */
export const staggerItemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <motion.div variants={staggerItemVariants} className={className}>
            {children}
        </motion.div>
    );
}

/* ───────────────── FadeIn (standalone, with optional delay) ───── */
export function FadeIn({
    children,
    delay = 0,
    className,
    once = true,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
    once?: boolean;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once, margin: "-40px" }}
            transition={{ duration: 0.5, delay, ease }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ───────────────── ScaleIn (for modals, popovers) ───────────── */
export const scaleInVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease } },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

/* ───────────────── Slide from right (for toasts) ───────────── */
export const slideRightVariants: Variants = {
    hidden: { opacity: 0, x: 80, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.3, ease } },
    exit: { opacity: 0, x: 40, scale: 0.95, transition: { duration: 0.2 } },
};
