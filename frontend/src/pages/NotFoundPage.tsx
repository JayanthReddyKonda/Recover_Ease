import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Button from "@/components/Button";
import { ArrowLeft, Heart } from "lucide-react";

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function NotFoundPage() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-hero px-4 text-center">
            <div className="pointer-events-none absolute -top-40 -right-40 h-[400px] w-[400px] rounded-full bg-primary-200/20 blur-3xl" />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease }}
            >
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
                    <Heart className="h-8 w-8 text-primary-400" />
                </div>
                <p className="text-8xl font-extrabold tracking-tight text-gray-200">404</p>
                <h1 className="mt-4 text-xl font-bold text-gray-800">Page Not Found</h1>
                <p className="mt-2 max-w-sm text-sm text-gray-500">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link to="/" className="mt-8 inline-block">
                    <Button><ArrowLeft className="h-4 w-4" /> Back to Home</Button>
                </Link>
            </motion.div>
        </div>
    );
}
