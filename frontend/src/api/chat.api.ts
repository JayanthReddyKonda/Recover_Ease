import api from "./axios";
import type { ApiResponse, ChatMessage, ChatSession } from "@/types";

export const chatApi = {
    /** List all sessions for the current user */
    getSessions: () => api.get<ApiResponse<ChatSession[]>>("/chat/sessions"),

    /** Get or create the AI session (patient only) */
    getAiSession: () => api.post<ApiResponse<ChatSession>>("/chat/sessions/ai"),

    /** Patient requests a chat session with a doctor */
    requestDoctorChat: (doctorId: string) =>
        api.post<ApiResponse<ChatSession>>("/chat/sessions", { doctor_id: doctorId }),

    /** Doctor accepts a REQUESTED session */
    acceptSession: (sessionId: string) =>
        api.post<ApiResponse<ChatSession>>(`/chat/sessions/${sessionId}/accept`),

    /** Close a session */
    closeSession: (sessionId: string) =>
        api.post<ApiResponse<ChatSession>>(`/chat/sessions/${sessionId}/close`),

    /** Get all messages in a session */
    getMessages: (sessionId: string) =>
        api.get<ApiResponse<ChatMessage[]>>(`/chat/sessions/${sessionId}/messages`),

    /** Send a message (doctor ↔ patient session) */
    sendMessage: (sessionId: string, content: string, isVoice = false) =>
        api.post<ApiResponse<ChatMessage>>(`/chat/sessions/${sessionId}/messages`, {
            content,
            is_voice: isVoice,
        }),

    /** Send a message to the AI and receive a reply */
    sendAiMessage: (sessionId: string, content: string, isVoice = false) =>
        api.post<ApiResponse<{ user_message: ChatMessage; ai_reply: ChatMessage }>>("/chat/ai/message", {
            session_id: sessionId,
            content,
            is_voice: isVoice,
        }),

    /** Send a recorded voice message; backend transcribes via Groq Whisper */
    sendVoiceMessage: (sessionId: string, audioBlob: Blob) => {
        const form = new FormData();
        form.append("file", audioBlob, "voice.webm");
        return api.post<ApiResponse<ChatMessage>>(
            `/chat/sessions/${sessionId}/voice-message`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
        );
    },

    /** Send an image from gallery/files (doctor–patient sessions only) */
    sendImageMessage: (sessionId: string, imageFile: File) => {
        const form = new FormData();
        form.append("file", imageFile, imageFile.name);
        return api.post<ApiResponse<ChatMessage>>(
            `/chat/sessions/${sessionId}/image-message`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } },
        );
    },
};
