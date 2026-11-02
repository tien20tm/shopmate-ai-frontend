import { ChatPanel } from "@/components/chat/ChatPanel";

export default function ChatPage() {
  return (
    <div className="mx-auto h-[calc(100dvh-8rem)] min-h-96 w-full max-w-3xl">
      <ChatPanel titleAs="h1" />
    </div>
  );
}
