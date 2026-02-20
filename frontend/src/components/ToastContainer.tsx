import { useStore } from "@/store/useStore";
import Toast from "./Toast";

export default function ToastContainer() {
    const { toasts, removeToast } = useStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2">
            {toasts.map((t) => (
                <Toast key={t.id} toast={t} onDismiss={removeToast} />
            ))}
        </div>
    );
}
