import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { chatApi } from "@/api/chat.api";
import { requestApi } from "@/api/request.api";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/store/useStore";
import { useChatSocket } from "@/hooks/useSocket";
import { socketStore } from "@/lib/socketStore";
import { PageTransition } from "@/components/motion";
import { cn } from "@/lib/utils";
import type { ChatMessage, ChatSession, DoctorLink, NewMessageEvent, TypingEvent } from "@/types";
import {
    Bot,
    Send,
    Mic,
    MicOff,
    Square,
    X,
    Check,
    MessageSquare,
    Sparkles,
    Phone,
    UserCheck,
    Plus,
    ChevronRight,
    Volume2,
    Stethoscope,
    Paperclip,
    ImageIcon,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────

function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ─── Message bubble ──────────────────────────────────────

function MessageBubble({ msg, isSelf }: { msg: ChatMessage; isSelf: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "flex gap-2.5 max-w-[82%]",
                isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
        >
            {/* Avatar */}
            {!isSelf && (
                <div
                    className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                    style={{
                        background: msg.is_ai
                            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                            : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                    }}
                >
                    {msg.is_ai ? <Bot className="h-4 w-4" /> : (msg.sender_name?.charAt(0) ?? "D")}
                </div>
            )}

            <div className={cn("flex flex-col gap-1", isSelf ? "items-end" : "items-start")}>
                {!isSelf && (
                    <span className="text-[11px] font-medium text-gray-400 px-1">
                        {msg.is_ai ? "AI Assistant" : msg.sender_name}
                        {msg.is_voice && (
                            <span className="ml-1.5 inline-flex items-center gap-0.5 text-indigo-400">
                                <Volume2 className="h-3 w-3" /> voice
                            </span>
                        )}
                    </span>
                )}

                <div
                    className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isSelf
                            ? "rounded-br-sm text-white"
                            : msg.is_ai
                                ? "rounded-bl-sm text-gray-100"
                                : "rounded-bl-sm bg-white border border-gray-100 text-gray-800 shadow-sm"
                    )}
                    style={
                        isSelf
                            ? { background: "linear-gradient(135deg, #6366f1, #4f46e5)" }
                            : msg.is_ai
                                ? { background: "linear-gradient(135deg, #1e1b4b, #312e81)", border: "1px solid rgba(99,102,241,0.25)" }
                                : undefined
                    }
                >
                    {msg.audio_url ? (
                        <div className="min-w-[180px] max-w-[260px]">
                            <audio
                                src={msg.audio_url}
                                controls
                                className="w-full rounded-lg"
                                style={{ height: "36px", colorScheme: isSelf ? "dark" : "light" }}
                            />
                            {msg.content && (
                                <p className="mt-1.5 text-xs opacity-70 italic leading-relaxed">&#34;{msg.content}&#34;</p>
                            )}
                        </div>
                    ) : msg.image_url ? (
                        <div className="min-w-[160px] max-w-[280px]">
                            <img
                                src={msg.image_url}
                                alt="Shared image"
                                className="w-full rounded-xl object-cover cursor-pointer"
                                style={{ maxHeight: "260px" }}
                                onClick={() => window.open(msg.image_url!, "_blank")}
                            />
                        </div>
                    ) : (
                        msg.content
                    )}
                </div>

                <span className="text-[10px] text-gray-300 px-1">{formatTime(msg.created_at)}</span>
            </div>
        </motion.div>
    );
}

// ─── Session list item ───────────────────────────────────

function SessionItem({
    session,
    isSelected,
    onClick,
}: {
    session: ChatSession;
    isSelected: boolean;
    onClick: () => void;
}) {
    const { user } = useAuth();
    const isAI = !session.doctor_id;
    // Doctors see the patient's name; patients see the doctor's name (stored in title)
    const isDoctor = user?.role === "DOCTOR";
    const displayTitle = isAI
        ? session.title
        : isDoctor
            ? (session.patient_name ?? session.title)
            : session.title;
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all group",
                isSelected
                    ? "bg-primary-500/15 border border-primary-500/25"
                    : "hover:bg-gray-50 border border-transparent"
            )}
        >
            <div
                className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
                style={{
                    background: isAI
                        ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                        : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                }}
            >
                {isAI ? <Sparkles className="h-4 w-4" /> : displayTitle.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{displayTitle}</p>
                    {session.status === "REQUESTED" && (
                        <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600">
                            Pending
                        </span>
                    )}
                    {session.status === "CLOSED" && (
                        <span className="flex-shrink-0 text-[10px] text-gray-400">Closed</span>
                    )}
                </div>
                {session.last_message && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{session.last_message}</p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
        </button>
    );
}

// ─── Voice recording hook ────────────────────────────────

function useVoiceInput(onTranscript: (text: string, isFinal: boolean) => void) {
    const [isListening, setIsListening] = useState(false);
    const [supported] = useState(
        () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window
    );
    const recognitionRef = useRef<unknown>(null);

    const start = useCallback(() => {
        if (!supported) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const r = new SR();
        r.lang = "en-US";
        r.continuous = true;
        r.interimResults = true;

        r.onresult = (e: unknown) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ev = e as any;
            let interim = "";
            let final = "";
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                const t = ev.results[i][0].transcript;
                if (ev.results[i].isFinal) final += t;
                else interim += t;
            }
            if (final) onTranscript(final, true);
            else if (interim) onTranscript(interim, false);
        };

        r.onerror = () => setIsListening(false);
        r.onend = () => setIsListening(false);

        recognitionRef.current = r;
        r.start();
        setIsListening(true);
    }, [supported, onTranscript]);

    const stop = useCallback(() => {
        (recognitionRef.current as { stop: () => void } | null)?.stop();
        setIsListening(false);
    }, []);

    const toggle = useCallback(() => {
        if (isListening) stop();
        else start();
    }, [isListening, stop, start]);

    return { isListening, supported, toggle, stop };
}

// ─── Voice recorder hook (sends actual audio) ────────────────────

function useVoiceRecorder(onDone: (blob: Blob) => void) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const supported =
        typeof window !== "undefined" && !!navigator?.mediaDevices?.getUserMedia;

    const start = useCallback(async () => {
        if (!supported) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : MediaRecorder.isTypeSupported("audio/webm")
                    ? "audio/webm"
                    : "audio/ogg";
            const mr = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                stream.getTracks().forEach((t) => t.stop());
                onDone(blob);
            };
            mr.start(200);
            mediaRef.current = mr;
            setIsRecording(true);
            setDuration(0);
            timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
        } catch {
            // microphone permission denied or not available
        }
    }, [supported, onDone]);

    const stop = useCallback(() => {
        mediaRef.current?.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
    }, []);

    // auto-stop at 2 minutes
    useEffect(() => {
        if (duration >= 120) stop();
    }, [duration, stop]);

    return { isRecording, duration, supported, start, stop };
}

// ─── Chat thread view ────────────────────────────────────

function ChatThread({
    session,
    userId,
    onAccept,
    onClose,
}: {
    session: ChatSession;
    userId: string;
    onAccept?: () => void;
    onClose?: () => void;
}) {
    const qc = useQueryClient();
    const addToast = useStore((s) => s.addToast);
    const { user } = useAuth();
    const [text, setText] = useState("");
    const [interimText, setInterimText] = useState("");
    const [typingName, setTypingName] = useState<string | null>(null);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [imgPreview, setImgPreview] = useState<string | null>(null);
    const [imgFile, setImgFile] = useState<File | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isAI = !session.doctor_id;
    const isActive = session.status === "ACTIVE";
    const isDoctor = user?.role === "DOCTOR";
    const threadTitle = isAI
        ? session.title
        : isDoctor
            ? (session.patient_name ?? session.title)
            : session.title;

    const messages = useQuery({
        queryKey: ["chat-messages", session.id],
        queryFn: () => chatApi.getMessages(session.id).then((r) => r.data.data ?? []),
    });

    const sendDocMsg = useMutation({
        mutationFn: (content: string) => chatApi.sendMessage(session.id, content, voice.isListening),
        onSuccess: (res) => {
            if (res.data.data) {
                qc.setQueryData<ChatMessage[]>(["chat-messages", session.id], (old = []) => [
                    ...old,
                    res.data.data!,
                ]);
            }
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
        onError: (e: Error) => addToast("error", "Failed", e.message),
    });

    const sendVoiceMsgMut = useMutation({
        mutationFn: (blob: Blob) => chatApi.sendVoiceMessage(session.id, blob),
        onSuccess: (res) => {
            const msg = res.data.data;
            if (msg) {
                qc.setQueryData<ChatMessage[]>(["chat-messages", session.id], (old = []) => [
                    ...old,
                    msg,
                ]);
            }
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
        onError: (e: Error) => addToast("error", "Voice send failed", e.message),
    });

    const recorder = useVoiceRecorder((blob) => sendVoiceMsgMut.mutate(blob));

    const sendImageMut = useMutation({
        mutationFn: (file: File) => chatApi.sendImageMessage(session.id, file),
        onSuccess: (res) => {
            const msg = res.data.data;
            if (msg) {
                qc.setQueryData<ChatMessage[]>(["chat-messages", session.id], (old = []) => [
                    ...old,
                    msg,
                ]);
            }
            setImgPreview(null);
            setImgFile(null);
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
        onError: (e: Error) => addToast("error", "Image send failed", e.message),
    });

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImgFile(file);
        const reader = new FileReader();
        reader.onload = () => setImgPreview(reader.result as string);
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const sendImage = () => {
        if (!imgFile) return;
        sendImageMut.mutate(imgFile);
    };

    const cancelImage = () => {
        setImgPreview(null);
        setImgFile(null);
    };

    const sendAiMsg = useMutation({
        mutationFn: (content: string) => chatApi.sendAiMessage(session.id, content, voice.isListening),
        onMutate: () => setIsAiTyping(true),
        onSuccess: (res) => {
            setIsAiTyping(false);
            const d = res.data.data;
            if (d) {
                qc.setQueryData<ChatMessage[]>(["chat-messages", session.id], (old = []) => [
                    ...old,
                    d.user_message,
                    d.ai_reply,
                ]);
            }
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
        onError: (e: Error) => {
            setIsAiTyping(false);
            addToast("error", "AI error", e.message);
        },
    });

    // Typing indicator emit
    const emitTyping = useCallback(() => {
        const socket = socketStore.get();
        if (!socket || isAI) return;
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        socket.emit("typing", { session_id: session.id, user_name: "You" });
        typingTimeout.current = setTimeout(() => setTypingName(null), 2500);
    }, [session.id, isAI]);

    // Real-time messages
    useChatSocket(
        session.id,
        (ev: NewMessageEvent) => {
            const msg = ev.message;
            qc.setQueryData<ChatMessage[]>(["chat-messages", session.id], (old = []) => {
                if (old.some((m) => m.id === msg.id)) return old;
                return [...old, msg];
            });
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
        },
        (ev: TypingEvent) => {
            setTypingName(ev.user_name);
            setTimeout(() => setTypingName(null), 2500);
        },
    );

    // Voice hook
    const voice = useVoiceInput((t, isFinal) => {
        if (isFinal) {
            setText((prev) => prev ? `${prev} ${t}` : t);
            setInterimText("");
        } else {
            setInterimText(t);
        }
    });

    // Scroll to bottom
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.data, isAiTyping, typingName]);

    function handleSend() {
        const content = text.trim();
        if (!content || sendDocMsg.isPending || sendAiMsg.isPending) return;
        setText("");
        setInterimText("");
        voice.stop();
        if (isAI) sendAiMsg.mutate(content);
        else sendDocMsg.mutate(content);
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const msgs: ChatMessage[] = messages.data ?? [];

    // Group messages by date
    const grouped: { date: string; msgs: ChatMessage[] }[] = [];
    msgs.forEach((m) => {
        const d = formatDate(m.created_at);
        if (!grouped.length || grouped[grouped.length - 1].date !== d) {
            grouped.push({ date: d, msgs: [m] });
        } else {
            grouped[grouped.length - 1].msgs.push(m);
        }
    });

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white text-xs font-bold shadow-sm"
                    style={{
                        background: isAI
                            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                            : "linear-gradient(135deg, #0ea5e9, #6366f1)",
                    }}
                >
                    {isAI ? <Sparkles className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{threadTitle}</p>
                    <p className="text-[11px] text-gray-400">
                        {isAI ? "AI-powered recovery assistant" : session.status === "REQUESTED" ? "Pending approval" : "Active session"}
                    </p>
                </div>
                {session.status === "REQUESTED" && onAccept && (
                    <button
                        onClick={onAccept}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors"
                    >
                        <Check className="h-3.5 w-3.5" /> Accept
                    </button>
                )}
                {isActive && onClose && (
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" /> Close
                    </button>
                )}
            </div>

            {/* Pending request banner (patient POV) */}
            {session.status === "REQUESTED" && session.patient_id === userId && (
                <div className="mx-4 mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    Waiting for the doctor to accept your chat request…
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-400 border-t-transparent" />
                    </div>
                ) : msgs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                        <div
                            className="h-16 w-16 rounded-2xl flex items-center justify-center"
                            style={{ background: isAI ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
                        >
                            {isAI ? <Sparkles className="h-7 w-7 text-white" /> : <MessageSquare className="h-7 w-7 text-white" />}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-700">
                                {isAI ? "Ask me anything about your recovery" : "Start the conversation"}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                {isAI
                                    ? "I can help with pain management, sleep tips, exercise, and more."
                                    : "Your messages are private and encrypted."}
                            </p>
                        </div>
                    </div>
                ) : (
                    grouped.map((group) => (
                        <div key={group.date}>
                            <div className="flex items-center gap-3 my-3">
                                <div className="h-px flex-1 bg-gray-100" />
                                <span className="text-[11px] font-medium text-gray-300">{group.date}</span>
                                <div className="h-px flex-1 bg-gray-100" />
                            </div>
                            <div className="space-y-3">
                                {group.msgs.map((msg) => (
                                    <MessageBubble
                                        key={msg.id}
                                        msg={msg}
                                        isSelf={msg.sender_id === userId}
                                    />
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {/* Typing indicator */}
                <AnimatePresence>
                    {(typingName || isAiTyping) && (
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="flex items-center gap-2"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-xl"
                                style={{ background: isAI ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
                                {isAI ? <Bot className="h-3.5 w-3.5 text-white" /> : <Stethoscope className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-gray-100 px-3 py-2">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce"
                                        style={{ animationDelay: `${i * 0.15}s` }}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-gray-400">{isAiTyping ? "AI is typing…" : `${typingName} is typing…`}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={bottomRef} />
            </div>

            {/* Voice transcript preview — doctor-patient only */}
            {!isAI && (
                <AnimatePresence>
                    {(voice.isListening || interimText) && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mx-4 mb-2 overflow-hidden"
                        >
                            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                                <div className="flex gap-0.5 items-end h-5">
                                    {[3, 5, 4, 6, 3, 5, 4, 3, 6, 4].map((h, i) => (
                                        <span
                                            key={i}
                                            className="w-0.5 rounded-full bg-primary-400 animate-bounce"
                                            style={{ height: `${voice.isListening ? h * 2 : 4}px`, animationDelay: `${i * 0.05}s`, animationDuration: "0.6s" }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-primary-600 italic flex-1 truncate">
                                    {interimText || "Listening…"}
                                </span>
                                <button onClick={voice.stop} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Voice recording indicator — doctor-patient only */}
            {!isAI && (
                <AnimatePresence>
                    {recorder.isRecording && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mx-4 mb-2 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <div className="flex h-2.5 w-2.5 shrink-0">
                                    <span className="h-full w-full rounded-full bg-red-500 animate-ping" />
                                </div>
                                <div className="flex gap-0.5 items-end h-5">
                                    {[2, 4, 3, 5, 2, 4, 3, 2, 5, 3].map((h, i) => (
                                        <span
                                            key={i}
                                            className="w-0.5 rounded-full bg-red-400 animate-bounce"
                                            style={{ height: `${h * 2.5}px`, animationDelay: `${i * 0.06}s`, animationDuration: "0.5s" }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-red-600 font-mono font-semibold">
                                    {Math.floor(recorder.duration / 60)}:{String(recorder.duration % 60).padStart(2, "0")}
                                </span>
                                <span className="flex-1 text-xs text-red-500">Recording…</span>
                                <button
                                    type="button"
                                    onClick={recorder.stop}
                                    className="text-xs font-medium text-red-600 hover:text-red-800 flex items-center gap-1"
                                >
                                    <Square className="h-3 w-3" /> Send
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}

            {/* Image preview — doctor-patient only */}
            {!isAI && imgPreview && (
                <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl p-2" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <img src={imgPreview} alt="Preview" className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex flex-col gap-1.5 justify-between h-20">
                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{imgFile?.name}</p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={sendImage}
                                disabled={sendImageMut.isPending}
                                className="flex items-center gap-1 rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                            >
                                {sendImageMut.isPending ? (
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                ) : (
                                    <ImageIcon className="h-3 w-3" />
                                )}
                                Send
                            </button>
                            <button
                                type="button"
                                onClick={cancelImage}
                                className="flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
                            >
                                <X className="h-3 w-3" /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Input bar */}
            <div className="border-t border-gray-100 p-3">
                {session.status === "CLOSED" ? (
                    <p className="text-center text-sm text-gray-400 py-2">This session is closed.</p>
                ) : session.status === "REQUESTED" && session.patient_id !== userId ? (
                    <p className="text-center text-sm text-amber-500 py-2">Accept the request to start chatting.</p>
                ) : (
                    <div className="flex items-end gap-2">
                        {/* Hidden image file input */}
                        {!isAI && (
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageSelect}
                            />
                        )}

                        <div className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-primary-400 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary-200 transition-all">
                            <textarea
                                value={text}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    emitTyping();
                                }}
                                onKeyDown={handleKeyDown}
                                rows={1}
                                placeholder={isAI ? "Ask the AI assistant…" : "Type a message…"}
                                className="w-full resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
                                style={{ maxHeight: "96px" }}
                            />
                        </div>

                        {/* Doctor-patient only: Speech-to-text + voice recorder + image */}
                        {!isAI && (
                            <>
                                {voice.supported && (
                                    <button
                                        type="button"
                                        onClick={voice.toggle}
                                        className={cn(
                                            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                                            voice.isListening
                                                ? "bg-indigo-500 text-white shadow-md shadow-indigo-200 scale-105"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                        )}
                                        title={voice.isListening ? "Stop dictation" : "Dictate message"}
                                    >
                                        {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                    </button>
                                )}

                                {recorder.supported && (
                                    <button
                                        type="button"
                                        onClick={() => recorder.isRecording ? recorder.stop() : recorder.start()}
                                        disabled={sendVoiceMsgMut.isPending}
                                        className={cn(
                                            "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                                            recorder.isRecording
                                                ? "bg-red-500 text-white shadow-lg shadow-red-200 scale-105"
                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-40"
                                        )}
                                        title={recorder.isRecording ? "Stop & send voice message" : "Record voice message"}
                                    >
                                        {sendVoiceMsgMut.isPending ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        ) : recorder.isRecording ? (
                                            <Square className="h-3.5 w-3.5" />
                                        ) : (
                                            <Stethoscope className="h-4 w-4" />
                                        )}
                                    </button>
                                )}

                                {/* Image attachment button */}
                                <button
                                    type="button"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={sendImageMut.isPending || !!imgPreview}
                                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all disabled:opacity-40"
                                    title="Attach image"
                                >
                                    <Paperclip className="h-4 w-4" />
                                </button>
                            </>
                        )}

                        {/* Send button */}
                        <button
                            type="button"
                            onClick={handleSend}
                            disabled={!text.trim() || sendDocMsg.isPending || sendAiMsg.isPending}
                            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                        >
                            {sendDocMsg.isPending || sendAiMsg.isPending ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Request chat modal ──────────────────────────────────

function RequestChatModal({
    doctors,
    existingSessions,
    onRequest,
    onClose,
}: {
    doctors: DoctorLink[];
    existingSessions: ChatSession[];
    onRequest: (doctorId: string) => void;
    onClose: () => void;
}) {
    const existingDoctorIds = new Set(existingSessions.map((s) => s.doctor_id).filter(Boolean));
    const available = doctors.filter((d) => d.doctor_id && !existingDoctorIds.has(d.doctor_id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Chat with a Doctor</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {available.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center">
                        No doctors available to chat with, or sessions already exist.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {available.map((link) => (
                            <li key={link.link_id}>
                                <button
                                    onClick={() => onRequest(link.doctor_id)}
                                    className="w-full flex items-center gap-3 rounded-xl border border-gray-100 p-3 hover:bg-gray-50 text-left transition-colors"
                                >
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}>
                                        {link.doctor?.name?.charAt(0) ?? "D"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">Dr. {link.doctor?.name}</p>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            {link.is_active ? (
                                                <><UserCheck className="h-3 w-3 text-emerald-500" /> Active treatment</>
                                            ) : (
                                                <><Stethoscope className="h-3 w-3 text-amber-400" /> Past doctor — request required</>
                                            )}
                                        </p>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </motion.div>
        </div>
    );
}

// ─── Main ChatPage ──────────────────────────────────────

export default function ChatPage() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const addToast = useStore((s) => s.addToast);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const isPatient = user?.role === "PATIENT";
    const isDoctor = user?.role === "DOCTOR";

    const sessions = useQuery({
        queryKey: ["chat-sessions"],
        queryFn: () => chatApi.getSessions().then((r) => r.data.data ?? []),
    });

    const myDoctors = useQuery({
        queryKey: ["my-doctors"],
        queryFn: () => requestApi.getMyDoctors().then((r) => (r.data ?? []) as DoctorLink[]),
        enabled: isPatient,
    });

    // Ensure patient always has an AI session available
    const ensureAiSession = useMutation({
        mutationFn: () => chatApi.getAiSession(),
        onSuccess: (res) => {
            const s = res.data.data;
            if (s) {
                qc.setQueryData<ChatSession[]>(["chat-sessions"], (old = []) => {
                    if (old.some((x) => x.id === s.id)) return old;
                    return [s, ...old];
                });
                if (!selectedId) setSelectedId(s.id);
            }
        },
    });

    useEffect(() => {
        if (isPatient && !ensureAiSession.isPending && !ensureAiSession.isSuccess) {
            ensureAiSession.mutate();
        }
    }, [isPatient]);

    const requestChat = useMutation({
        mutationFn: (doctorId: string) => chatApi.requestDoctorChat(doctorId),
        onSuccess: (res) => {
            const s = res.data.data;
            if (s) {
                qc.invalidateQueries({ queryKey: ["chat-sessions"] });
                setSelectedId(s.id);
            }
            setShowRequestModal(false);
            addToast("success", "Session created", "Chat session started!");
        },
        onError: (e: Error) => {
            addToast("error", "Failed", e.message);
            setShowRequestModal(false);
        },
    });

    const acceptSession = useMutation({
        mutationFn: (sessionId: string) => chatApi.acceptSession(sessionId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
            addToast("success", "Accepted", "Chat session is now active");
        },
    });

    const closeSession = useMutation({
        mutationFn: (sessionId: string) => chatApi.closeSession(sessionId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["chat-sessions"] });
            addToast("info", "Closed", "Chat session closed");
        },
    });

    const allSessions: ChatSession[] = sessions.data ?? [];
    const selectedSession = allSessions.find((s) => s.id === selectedId) ?? null;
    const pendingRequests = isDoctor ? allSessions.filter((s) => s.status === "REQUESTED") : [];

    return (
        <PageTransition>
            <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-5rem)] gap-0 rounded-2xl overflow-hidden bg-white shadow-sm border border-gray-100/60">
                {/* ── Session list (left panel) ── */}
                <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-100">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
                        <div>
                            <h1 className="text-[15px] font-bold text-gray-900">Conversations</h1>
                            <p className="text-[11px] text-gray-400">{allSessions.length} active</p>
                        </div>
                        {isPatient && (
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}
                            >
                                <Plus className="h-3.5 w-3.5" /> Doctor
                            </button>
                        )}
                    </div>

                    {/* Pending requests banner (doctor) */}
                    {pendingRequests.length > 0 && (
                        <div className="mx-3 mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-amber-500" />
                            {pendingRequests.length} pending chat {pendingRequests.length === 1 ? "request" : "requests"}
                        </div>
                    )}

                    {/* AI session quick button (patient) */}
                    {isPatient && (
                        <div className="px-3 pt-3">
                            <button
                                onClick={() => {
                                    const ai = allSessions.find((s) => !s.doctor_id);
                                    if (ai) setSelectedId(ai.id);
                                    else ensureAiSession.mutate();
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all border",
                                    selectedSession && !selectedSession.doctor_id
                                        ? "border-violet-300 bg-violet-50"
                                        : "border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 hover:border-violet-300"
                                )}
                            >
                                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                                    <Sparkles className="h-3.5 w-3.5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-bold text-violet-700">AI Assistant</p>
                                    <p className="text-[10px] text-violet-400">Always available</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Session list */}
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
                        {sessions.isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse mb-1" />
                            ))
                        ) : (
                            allSessions
                                .filter((s) => isPatient ? !!s.doctor_id : true)
                                .map((s) => (
                                    <SessionItem
                                        key={s.id}
                                        session={s}
                                        isSelected={selectedId === s.id}
                                        onClick={() => setSelectedId(s.id)}
                                    />
                                ))
                        )}
                    </div>
                </div>

                {/* ── Chat thread (right panel) ── */}
                <div className="flex-1">
                    {selectedSession ? (
                        <ChatThread
                            session={selectedSession}
                            userId={user!.id}
                            onAccept={
                                isDoctor && selectedSession.status === "REQUESTED"
                                    ? () => acceptSession.mutate(selectedSession.id)
                                    : undefined
                            }
                            onClose={
                                selectedSession.status === "ACTIVE"
                                    ? () => closeSession.mutate(selectedSession.id)
                                    : undefined
                            }
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-8">
                            <div className="h-20 w-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f8f8ff, #e0e7ff)" }}>
                                <MessageSquare className="h-9 w-9 text-primary-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Select a conversation</h2>
                                <p className="text-sm text-gray-400 mt-1">
                                    {isPatient
                                        ? "Chat with the AI assistant or your doctors"
                                        : "Select a patient conversation or accept a pending request"}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Request chat modal */}
            <AnimatePresence>
                {showRequestModal && isPatient && (
                    <RequestChatModal
                        doctors={myDoctors.data ?? []}
                        existingSessions={allSessions}
                        onRequest={(id) => requestChat.mutate(id)}
                        onClose={() => setShowRequestModal(false)}
                    />
                )}
            </AnimatePresence>
        </PageTransition>
    );
}
