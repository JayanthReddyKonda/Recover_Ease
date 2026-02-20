import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    className?: string;
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    className,
}: ModalProps) {
    // Lock body scroll when open
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        else document.body.style.overflow = "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={clsx(
                    "card relative mx-4 w-full max-w-lg animate-in fade-in zoom-in-95",
                    className,
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                    {title && <h2 className="text-lg font-semibold">{title}</h2>}
                    <button
                        onClick={onClose}
                        className="ml-auto rounded-md p-1 hover:bg-gray-100"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
}
