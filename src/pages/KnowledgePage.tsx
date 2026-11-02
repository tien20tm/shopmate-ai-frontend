import { Link } from "react-router-dom";

import { EmptyState, LoadingRows, QueryError } from "@/components/QueryStates";
import { useDocuments } from "@/lib/queries";

const DOC_TYPE_LABELS: Record<string, string> = {
  faq: "Câu hỏi thường gặp",
  policy: "Chính sách",
};

function docTypeLabel(docType: string): string {
  return DOC_TYPE_LABELS[docType] ?? docType;
}

export default function KnowledgePage() {
  const documents = useDocuments();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-extrabold">Chính sách cửa hàng</h1>
      <p className="mt-1 mb-4 text-soft">
        Trợ lý AI dựa vào các tài liệu này khi trả lời bạn.
      </p>

      {documents.isPending && <LoadingRows rows={2} />}

      {documents.isError && (
        <QueryError
          error={documents.error}
          onRetry={() => documents.refetch()}
        />
      )}

      {documents.data?.length === 0 && (
        <EmptyState>
          <p>Chưa có tài liệu nào.</p>
        </EmptyState>
      )}

      {documents.data && documents.data.length > 0 && (
        <ul className="flex flex-col gap-3">
          {documents.data.map((doc) => (
            <li key={doc.slug}>
              <Link
                to={`/knowledge/${encodeURIComponent(doc.slug)}`}
                className="block rounded-lg border bg-card p-5 shadow-soft transition-colors hover:border-primary"
              >
                <span className="text-xs font-semibold text-soft">
                  {docTypeLabel(doc.doc_type)}
                </span>
                <h2 className="text-lg font-extrabold">{doc.title}</h2>
                <p className="mt-1 text-sm text-soft">{doc.preview}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
