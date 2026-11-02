import { Link, useNavigate, useParams } from "react-router-dom";

import { useChat } from "@/components/chat/ChatProvider";
import { StatusPill, StatusTrack } from "@/components/orders/StatusTrack";
import { LoadingRows, QueryError } from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatVnd, orderTotal } from "@/lib/format";
import { useOrder } from "@/lib/queries";

export default function OrderDetailPage() {
  const { orderId = "" } = useParams();
  const order = useOrder(orderId);
  const { setDraft } = useChat();
  const navigate = useNavigate();

  if (order.isPending) return <LoadingRows rows={3} />;

  if (order.isError) {
    return (
      <QueryError
        error={order.error}
        onRetry={() => order.refetch()}
        backTo="/orders"
        backLabel="Về danh sách đơn hàng"
      />
    );
  }

  const { data } = order;

  function askAboutOrder() {
    // Only the order code goes along; the agent looks up the status itself.
    setDraft(`Tình trạng đơn ${data.id} của tôi thế nào?`);
    navigate("/chat");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        to="/orders"
        className="self-start text-sm font-semibold text-primary-dark hover:underline"
      >
        Về danh sách đơn hàng
      </Link>

      <article className="flex flex-col gap-6 rounded-lg border bg-card p-5 shadow-soft md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tabular-nums">{data.id}</h1>
            <StatusPill status={data.status} />
          </div>
          <Button onClick={askAboutOrder}>Hỏi AI về đơn này</Button>
        </header>

        <StatusTrack status={data.status} showLabels />

        <dl className="grid gap-4 rounded-md bg-mint p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-soft">Ngày đặt</dt>
            <dd className="font-bold">{formatDateTime(data.created_at)}</dd>
          </div>
          {(data.delivered_at || data.status !== "cancelled") && (
            <div>
              <dt className="text-soft">Ngày giao</dt>
              <dd className="font-bold">
                {data.delivered_at
                  ? formatDateTime(data.delivered_at)
                  : "Chưa giao"}
              </dd>
            </div>
          )}
        </dl>

        <section aria-label="Sản phẩm trong đơn">
          <ul className="flex flex-col divide-y">
            {data.items.map((item) => (
              <li
                key={item.product.id}
                className="grid grid-cols-[1fr_auto] gap-x-4 py-3"
              >
                <Link
                  to={`/products/${item.product.id}`}
                  className="font-semibold hover:text-primary-dark hover:underline"
                >
                  {item.product.name}
                </Link>
                <span className="text-right font-bold tabular-nums">
                  {formatVnd(item.quantity * Number(item.unit_price))}
                </span>
                <span className="text-sm text-soft">
                  {item.product.sku}, {item.quantity} ×{" "}
                  {formatVnd(item.unit_price)}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex items-baseline justify-between border-t pt-4">
            <span className="font-semibold">Tổng tiền</span>
            <span className="text-2xl font-extrabold text-primary-dark tabular-nums">
              {formatVnd(orderTotal(data))}
            </span>
          </p>
        </section>
      </article>
    </div>
  );
}
