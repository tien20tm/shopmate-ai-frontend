import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api";

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Đang tải" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-8 text-center shadow-soft">
      {children}
    </div>
  );
}

function isMissing(error: Error) {
  // A malformed id in the URL (422) means the same thing to a reader as a 404.
  return (
    error instanceof ApiError &&
    (error.kind === "not_found" || error.kind === "validation")
  );
}

interface QueryErrorProps {
  error: Error;
  onRetry: () => void;
  backTo?: string;
  backLabel?: string;
}

export function QueryError({
  error,
  onRetry,
  backTo,
  backLabel,
}: QueryErrorProps) {
  if (isMissing(error) && backTo) {
    return (
      <EmptyState>
        <p className="mb-4 font-bold">Không tìm thấy dữ liệu.</p>
        <Button variant="outline" asChild>
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </EmptyState>
    );
  }

  return (
    <div role="alert" className="rounded-lg bg-alert-tint p-6">
      <p className="mb-4 font-bold text-alert">{error.message}</p>
      <Button variant="outline" onClick={onRetry}>
        Thử lại
      </Button>
    </div>
  );
}

interface PaginationProps {
  page: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, hasNext, onPageChange }: PaginationProps) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav
      aria-label="Phân trang"
      className="mt-6 flex items-center justify-between"
    >
      <Button
        variant="outline"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Trang trước
      </Button>
      <span className="text-sm font-semibold">Trang {page}</span>
      <Button
        variant="outline"
        disabled={!hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        Trang sau
      </Button>
    </nav>
  );
}
