import { AnimatePresence } from "framer-motion";
import { useStore } from "@/store/useStore";
import Toast from "./Toast";

export default function ToastContainer() {
    const { toasts, removeToast } = useStore();

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 lg:bottom-6 lg:right-6">
            <AnimatePresence mode="popLayout">
                {toasts.map((t) => (
                    <Toast key={t.id} toast={t} onDismiss={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
}
