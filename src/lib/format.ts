import type { Order } from "@/types/api";

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatVnd(amount: string | number): string {
  return vndFormatter.format(Number(amount));
}

export function formatDateTime(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

// Uses unit_price, the price at purchase time, never the current product.price.
export function orderTotal(order: Order): number {
  return order.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.unit_price),
    0,
  );
}

export function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
