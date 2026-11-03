import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ChatProvider } from "@/components/chat/ChatProvider";
import ChatPage from "@/pages/ChatPage";

const DOCUMENTS = [
  {
    slug: "policies-cancellation_policy",
    document_id: "policies/cancellation_policy",
    title: "Chính sách hủy đơn hàng",
    doc_type: "policy",
    preview: "...",
  },
];

const ANSWER = {
  answer: "Đơn đang giao nên không hủy trực tiếp được.",
  sources: [
    {
      document_id: "policies/cancellation_policy",
      title: "Chính sách hủy đơn hàng",
      chunk_index: 0,
      similarity: 0.9,
    },
    {
      document_id: "policies/cancellation_policy",
      title: "Chính sách hủy đơn hàng",
      chunk_index: 1,
      similarity: 0.8,
    },
  ],
  tools_used: ["get_order_status", "search_knowledge_base"],
};

type ChatReply = () => Promise<Response> | Response;

function stubBackend(replies: ChatReply[]) {
  const chatBodies: { session_id: string; message: string }[] = [];
  const queue = [...replies];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/v1/chat")) {
        chatBodies.push(JSON.parse(String(init?.body)));
        return queue.shift()!();
      }
      return new Response(JSON.stringify(DOCUMENTS));
    }),
  );

  return chatBodies;
}

const ok: ChatReply = () => new Response(JSON.stringify(ANSWER));

function renderChat() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChatProvider>
          <ChatPage />
        </ChatProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function ask(text: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Câu hỏi của bạn"), text);
  await user.click(screen.getByRole("button", { name: "Gửi câu hỏi" }));
}

describe("ChatPage", () => {
  it("shows the answer, one link per source document and tools used", async () => {
    stubBackend([ok]);
    renderChat();

    await ask("Hủy đơn được không?");

    expect(await screen.findByText(ANSWER.answer)).toBeInTheDocument();
    expect(screen.getByText("Tài liệu tham khảo")).toBeInTheDocument();
    const link = await screen.findByRole("link", {
      name: "Chính sách hủy đơn hàng",
    });
    expect(link).toHaveAttribute(
      "href",
      "/knowledge/policies-cancellation_policy",
    );
    expect(screen.getByText("Tool call của agent:").parentElement).toHaveTextContent(
      "Tra cứu đơn hàng (get_order_status), Tra cứu chính sách (search_knowledge_base)",
    );
  });

  it("hides sources and tools when the response has none", async () => {
    stubBackend([
      () =>
        new Response(
          JSON.stringify({ answer: "Xin chào", sources: [], tools_used: [] }),
        ),
    ]);
    renderChat();

    await ask("Chào");

    expect(await screen.findByText("Xin chào")).toBeInTheDocument();
    expect(screen.queryByText("Tài liệu tham khảo")).not.toBeInTheDocument();
    expect(screen.queryByText(/Tool call của agent/)).not.toBeInTheDocument();
  });

  it("reuses the session id, and a new conversation gets a new one", async () => {
    const bodies = stubBackend([ok, ok, ok]);
    renderChat();

    await ask("Câu một");
    await screen.findByText(ANSWER.answer);
    await ask("Câu hai");
    await waitFor(() => expect(screen.getAllByText(ANSWER.answer)).toHaveLength(2));

    expect(bodies[0].session_id).toMatch(/^[a-zA-Z0-9_-]{1,64}$/);
    expect(bodies[1].session_id).toBe(bodies[0].session_id);

    await userEvent.click(
      screen.getByRole("button", { name: "Cuộc hội thoại mới" }),
    );
    expect(screen.queryByText(ANSWER.answer)).not.toBeInTheDocument();

    await ask("Câu ba");
    await screen.findByText(ANSWER.answer);
    expect(bodies[2].session_id).not.toBe(bodies[0].session_id);
  });

  it.each([
    ["503", () => new Response("{}", { status: 503 }), /chưa trả lời được/],
    ["422", () => new Response("{}", { status: 422 }), /chưa hợp lệ/],
    [
      "429",
      () =>
        new Response("{}", { status: 429, headers: { "Retry-After": "30" } }),
      /thử lại sau 30 giây/,
    ],
    [
      "503 daily limit",
      () =>
        new Response("{}", { status: 503, headers: { "Retry-After": "3600" } }),
      /hết lượt phục vụ trong hôm nay/,
    ],
    [
      "timeout",
      () => Promise.reject(new DOMException("t", "TimeoutError")),
      /quá lâu/,
    ],
  ] as [string, ChatReply, RegExp][])(
    "keeps the question and does not resend on %s",
    async (_name, reply, message) => {
      const bodies = stubBackend([reply]);
      renderChat();

      await ask("Câu hỏi của tôi");

      expect(await screen.findByRole("alert")).toHaveTextContent(message);
      expect(screen.getByLabelText("Câu hỏi của bạn")).toHaveValue(
        "Câu hỏi của tôi",
      );
      expect(bodies).toHaveLength(1);
    },
  );

  it("blocks sending while a reply is pending", async () => {
    let release!: (response: Response) => void;
    const bodies = stubBackend([
      () => new Promise<Response>((resolve) => (release = resolve)),
    ]);
    renderChat();
    const user = userEvent.setup();

    await ask("Câu một");
    await user.type(screen.getByLabelText("Câu hỏi của bạn"), "Câu hai{Enter}");

    expect(screen.getByRole("button", { name: "Gửi câu hỏi" })).toBeDisabled();
    expect(bodies).toHaveLength(1);

    release(new Response(JSON.stringify(ANSWER)));
    await screen.findByText(ANSWER.answer);
  });

  it("does not send blank or over-long messages", async () => {
    const bodies = stubBackend([]);
    renderChat();
    const user = userEvent.setup();
    const input = screen.getByLabelText("Câu hỏi của bạn");

    await user.type(input, "   ");
    expect(screen.getByRole("button", { name: "Gửi câu hỏi" })).toBeDisabled();

    await user.clear(input);
    await user.click(input);
    await user.paste("a".repeat(501));
    expect(screen.getByRole("button", { name: "Gửi câu hỏi" })).toBeDisabled();
    expect(screen.getByText(/dài quá 500 ký tự/)).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it("restores the conversation and session after a reload", async () => {
    const bodies = stubBackend([ok, ok]);
    const first = renderChat();

    await ask("Câu một");
    await screen.findByText(ANSWER.answer);
    first.unmount();

    renderChat();
    expect(screen.getByText(ANSWER.answer)).toBeInTheDocument();

    await ask("Câu hai");
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].session_id).toBe(bodies[0].session_id);
  });
});
