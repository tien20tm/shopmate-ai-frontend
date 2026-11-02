import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export const ORDERS_PAGE_SIZE = 10;
export const PRODUCTS_PAGE_SIZE = 12;

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: api.health, retry: false });
}

export function useOrders(page: number) {
  return useQuery({
    queryKey: ["orders", page],
    queryFn: () =>
      api.listOrders(ORDERS_PAGE_SIZE, (page - 1) * ORDERS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.getOrder(orderId),
  });
}

export function useProducts(page: number) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () =>
      api.listProducts(PRODUCTS_PAGE_SIZE, (page - 1) * PRODUCTS_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

export function useProduct(productId: string) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.getProduct(productId),
  });
}

export function useDocuments() {
  return useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
}

export function useDocument(slug: string) {
  return useQuery({
    queryKey: ["document", slug],
    queryFn: () => api.getDocument(slug),
  });
}
