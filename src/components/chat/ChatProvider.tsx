import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, ApiError } from "@/lib/api";
import type { ChatSource } from "@/types/api";

export const MAX_MESSAGE_LENGTH = 500;

const STORAGE_KEY = "shopmate.chat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  toolsUsed?: string[];
}

interface StoredChat {
  sessionId: string;
  messages: ChatMessage[];
}

interface ChatContextValue {
  messages: ChatMessage[];
  draft: string;
  setDraft: (draft: string) => void;
  pending: boolean;
  error: string | null;
  send: () => Promise<void>;
  startNewConversation: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function loadChat(): StoredChat {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as StoredChat;
  } catch {
    // Storage may be blocked or hold bad data; start a fresh conversation.
  }
  return { sessionId: crypto.randomUUID(), messages: [] };
}

function chatErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.kind === "timeout") {
    return "Trợ lý phản hồi quá lâu. Câu hỏi vẫn được giữ lại, bạn có thể gửi lại.";
  }
  if (error instanceof ApiError && error.kind === "server") {
    return "Trợ lý AI chưa trả lời được. Câu hỏi vẫn được giữ lại, bạn có thể gửi lại.";
  }
  return error instanceof Error ? error.message : "Không gửi được câu hỏi.";
}

// Lives above the routes so a pending reply survives moving between pages.
export function ChatProvider({ children }: { children: ReactNode }) {
  const [chat, setChat] = useState(loadChat);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A reload loses an in-flight request, so never store an unanswered turn.
    if (pending) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chat));
    } catch {
      // The conversation still works for this page view without storage.
    }
  }, [chat, pending]);

  const send = useCallback(async () => {
    const message = draft.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH || pending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setChat((current) => ({
      ...current,
      messages: [...current.messages, userMessage],
    }));
    setDraft("");
    setError(null);
    setPending(true);

    try {
      const response = await api.sendChat(chat.sessionId, message);
      setChat((current) => ({
        ...current,
        messages: [
          ...current.messages,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.answer,
            sources: response.sources,
            toolsUsed: response.tools_used,
          },
        ],
      }));
    } catch (sendError) {
      // Never resend automatically: the backend may already have handled it.
      setChat((current) => ({
        ...current,
        messages: current.messages.filter((m) => m.id !== userMessage.id),
      }));
      setDraft(message);
      setError(chatErrorMessage(sendError));
    } finally {
      setPending(false);
    }
  }, [chat.sessionId, draft, pending]);

  const startNewConversation = useCallback(() => {
    setChat({ sessionId: crypto.randomUUID(), messages: [] });
    setDraft("");
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      messages: chat.messages,
      draft,
      setDraft,
      pending,
      error,
      send,
      startNewConversation,
    }),
    [chat.messages, draft, pending, error, send, startNewConversation],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used inside ChatProvider");
  return context;
}
