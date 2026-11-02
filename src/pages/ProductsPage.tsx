import { Link, useSearchParams } from "react-router-dom";

import {
  EmptyState,
  LoadingRows,
  Pagination,
  QueryError,
} from "@/components/QueryStates";
import { formatVnd, parsePage } from "@/lib/format";
import { PRODUCTS_PAGE_SIZE, useProducts } from "@/lib/queries";

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const products = useProducts(page);

  return (
    <>
      <h1 className="mb-4 text-2xl font-extrabold">Sản phẩm</h1>

      {products.isPending && <LoadingRows />}

      {products.isError && (
        <QueryError error={products.error} onRetry={() => products.refetch()} />
      )}

      {products.data?.length === 0 && (
        <EmptyState>
          <p>
            {page === 1
              ? "Chưa có sản phẩm nào."
              : "Trang này không còn sản phẩm nào."}
          </p>
        </EmptyState>
      )}

      {products.data && products.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.data.map((product) => (
            <li key={product.id}>
              <Link
                to={`/products/${product.id}`}
                className="flex h-full flex-col gap-1 rounded-lg border bg-card p-4 shadow-soft transition-colors hover:border-primary"
              >
                <span className="text-xs text-soft">{product.sku}</span>
                <span className="font-bold">{product.name}</span>
                <span className="mt-1 font-extrabold text-primary-dark tabular-nums">
                  {formatVnd(product.price)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(products.data?.length ?? 0) > 0 || page > 1 ? (
        <Pagination
          page={page}
          hasNext={products.data?.length === PRODUCTS_PAGE_SIZE}
          onPageChange={(next) => setSearchParams({ page: String(next) })}
        />
      ) : null}
    </>
  );
}
