import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";

import { LoadingRows, QueryError } from "@/components/QueryStates";
import { useDocument } from "@/lib/queries";

export default function KnowledgeDetailPage() {
  const { slug = "" } = useParams();
  const document = useDocument(slug);

  if (document.isPending) return <LoadingRows rows={3} />;

  if (document.isError) {
    return (
      <QueryError
        error={document.error}
        onRetry={() => document.refetch()}
        backTo="/knowledge"
        backLabel="Về danh sách chính sách"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        to="/knowledge"
        className="self-start text-sm font-semibold text-primary-dark hover:underline"
      >
        Về danh sách chính sách
      </Link>
      <article className="markdown rounded-lg border bg-card p-6 shadow-soft md:p-8">
        <ReactMarkdown>{document.data.content}</ReactMarkdown>
      </article>
    </div>
  );
}
