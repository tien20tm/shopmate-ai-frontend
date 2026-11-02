import { Link, useSearchParams } from "react-router-dom";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { StatusPill, StatusTrack } from "@/components/orders/StatusTrack";
import {
  EmptyState,
  LoadingRows,
  Pagination,
  QueryError,
} from "@/components/QueryStates";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatVnd, orderTotal, parsePage } from "@/lib/format";
import { ORDERS_PAGE_SIZE, useOrders } from "@/lib/queries";
import type { Order } from "@/types/api";

function OrderRow({ order }: { order: Order }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <li>
      <Link
        to={`/orders/${encodeURIComponent(order.id)}`}
        className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-soft transition-colors hover:border-primary"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold tabular-nums">{order.id}</span>
              <StatusPill status={order.status} />
            </span>
            <span className="mt-0.5 block text-xs text-soft">
              {formatDateTime(order.created_at)}
            </span>
          </span>
          <span className="shrink-0 text-right">
            <span className="block font-bold tabular-nums">
              {formatVnd(orderTotal(order))}
            </span>
            <span className="block text-xs text-soft">
              {itemCount} sản phẩm
            </span>
          </span>
        </span>
        <StatusTrack status={order.status} />
      </Link>
    </li>
  );
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const orders = useOrders(page);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h1 className="mb-4 text-2xl font-extrabold">Đơn hàng của bạn</h1>

        {orders.isPending && <LoadingRows />}

        {orders.isError && (
          <QueryError error={orders.error} onRetry={() => orders.refetch()} />
        )}

        {orders.data?.length === 0 && (
          <EmptyState>
            {page === 1 ? (
              <p>Bạn chưa có đơn hàng nào.</p>
            ) : (
              <>
                <p className="mb-4">Trang này không còn đơn hàng nào.</p>
                <Button
                  variant="outline"
                  onClick={() => setSearchParams({ page: String(page - 1) })}
                >
                  Về trang trước
                </Button>
              </>
            )}
          </EmptyState>
        )}

        {orders.data && orders.data.length > 0 && (
          <>
            <ul className="flex flex-col gap-3">
              {orders.data.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </ul>
            <Pagination
              page={page}
              hasNext={orders.data.length === ORDERS_PAGE_SIZE}
              onPageChange={(next) => setSearchParams({ page: String(next) })}
            />
          </>
        )}
      </div>

      {/* Phones reach the assistant through its own page in the menu. */}
      <aside
        aria-label="Trợ lý AI"
        className="sticky top-20 hidden h-[calc(100dvh-7rem)] min-h-96 lg:block"
      >
        <ChatPanel titleAs="h2" />
      </aside>
    </div>
  );
}
