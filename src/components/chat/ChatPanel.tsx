import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";

import { AssistantMessage } from "@/components/chat/AssistantMessage";
import { MAX_MESSAGE_LENGTH, useChat } from "@/components/chat/ChatProvider";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Đơn ORD-0002 đang giao, tôi có hủy được không?",
  "Tôi được đổi trả trong bao lâu?",
  "Đơn ORD-0001 của tôi đang ở trạng thái nào?",
];

export function ChatPanel({ titleAs: Title }: { titleAs: "h1" | "h2" }) {
  const {
    messages,
    draft,
    setDraft,
    pending,
    error,
    send,
    startNewConversation,
  } = useChat();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const tooLong = draft.length > MAX_MESSAGE_LENGTH;
  const canSend = draft.trim().length > 0 && !tooLong && !pending;

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, pending]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      if (canSend) void send();
    }
  }

  function applySuggestion(suggestion: string) {
    setDraft(suggestion);
    inputRef.current?.focus();
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-lg border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <Title className="text-lg font-extrabold">Trợ lý AI</Title>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || messages.length === 0}
          onClick={startNewConversation}
        >
          Cuộc hội thoại mới
        </Button>
      </div>

      <div
        ref={listRef}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {messages.length === 0 && !pending && (
          <div>
            <p className="mb-3 font-semibold">
              Hỏi về đơn hàng của bạn hoặc chính sách của cửa hàng.
            </p>
            <ul className="flex flex-col items-start gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestion)}
                    className="rounded-md bg-mint px-3 py-2 text-left text-sm font-semibold text-primary-dark hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) =>
          message.role === "assistant" ? (
            <AssistantMessage key={message.id} message={message} />
          ) : (
            <p
              key={message.id}
              className="ml-auto max-w-[88%] rounded-lg bg-primary px-4 py-2.5 text-sm break-words whitespace-pre-wrap text-primary-foreground"
            >
              {message.content}
            </p>
          ),
        )}

        {pending && (
          <p role="status" className="text-sm font-semibold text-soft">
            Trợ lý đang tra cứu…
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-2 p-3 pt-0">
        {error && (
          <p
            role="alert"
            className="rounded-md bg-alert-tint px-3 py-2 text-sm font-semibold text-alert"
          >
            {error}
          </p>
        )}
        <div className="flex items-end gap-2 rounded-lg border bg-mint p-1.5 focus-within:border-primary">
          <label htmlFor="chat-input" className="sr-only">
            Câu hỏi của bạn
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
            value={draft}
            aria-invalid={tooLong}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi của bạn"
            className="field-sizing-content max-h-32 min-w-0 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-soft"
          />
          <Button
            type="submit"
            size="sm"
            aria-label="Gửi câu hỏi"
            disabled={!canSend}
          >
            Gửi
          </Button>
        </div>
        <p
          className={
            tooLong ? "text-xs font-bold text-alert" : "text-xs text-soft"
          }
        >
          {tooLong
            ? `Câu hỏi dài quá ${MAX_MESSAGE_LENGTH} ký tự. Hãy rút gọn trước khi gửi.`
            : "Lịch sử chỉ được giữ trong tab này."}
        </p>
      </form>
    </section>
  );
}
