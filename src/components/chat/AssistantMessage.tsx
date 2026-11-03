import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

import type { ChatMessage } from "@/components/chat/ChatProvider";
import { useDocuments } from "@/lib/queries";
import type { ChatSource } from "@/types/api";


const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: "Tra cứu chính sách",
  get_order_status: "Tra cứu đơn hàng",
};

function toolLabel(tool: string): string {
  const label = TOOL_LABELS[tool];
  return label ? `${label} (${tool})` : tool;
}

function uniqueByDocument(sources: ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.document_id)) return false;
    seen.add(source.document_id);
    return true;
  });
}

function SourceList({ sources }: { sources: ChatSource[] }) {
  const documents = useDocuments();

  return (
    <div className="mt-2 border-t pt-2 text-xs text-soft">
      <h3 className="font-bold">Tài liệu tham khảo</h3>
      <ul>
        {uniqueByDocument(sources).map((source) => {
          const document = documents.data?.find(
            (doc) => doc.document_id === source.document_id,
          );

          return (
            <li key={source.document_id}>
              {document ? (
                <Link
                  to={`/knowledge/${encodeURIComponent(document.slug)}`}
                  className="font-semibold text-primary-dark underline"
                >
                  {source.title}
                </Link>
              ) : (
                source.title
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AssistantMessage({ message }: { message: ChatMessage }) {
  const sources = message.sources ?? [];
  const tools = message.toolsUsed ?? [];

  return (
    <article className="mr-auto max-w-[92%] rounded-lg bg-mint px-4 py-3 text-sm">
      <div className="markdown">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
      {sources.length > 0 && <SourceList sources={sources} />}
      {tools.length > 0 && (
        <p className="mt-2 border-t pt-2 text-xs break-words text-soft">
          <span className="font-bold">Tool call đã sử dụng:</span>{" "}
          {tools.map(toolLabel).join(", ")}
        </p>
      )}
    </article>
  );
}
