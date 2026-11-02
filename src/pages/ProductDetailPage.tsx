import { Link, useParams } from "react-router-dom";

import { LoadingRows, QueryError } from "@/components/QueryStates";
import { formatVnd } from "@/lib/format";
import { useProduct } from "@/lib/queries";

export default function ProductDetailPage() {
  const { productId = "" } = useParams();
  const product = useProduct(productId);

  if (product.isPending) return <LoadingRows rows={2} />;

  if (product.isError) {
    return (
      <QueryError
        error={product.error}
        onRetry={() => product.refetch()}
        backTo="/products"
        backLabel="Về danh sách sản phẩm"
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link
        to="/products"
        className="self-start text-sm font-semibold text-primary-dark hover:underline"
      >
        Về danh sách sản phẩm
      </Link>
      <article className="rounded-lg border bg-card p-6 shadow-soft">
        <p className="text-sm text-soft">{product.data.sku}</p>
        <h1 className="mt-1 text-3xl font-extrabold">{product.data.name}</h1>
        <p className="mt-4 text-2xl font-extrabold text-primary-dark tabular-nums">
          {formatVnd(product.data.price)}
        </p>
      </article>
    </div>
  );
}
