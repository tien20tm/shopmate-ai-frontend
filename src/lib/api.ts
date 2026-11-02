import type {
  ChatResponse,
  ChatSource,
  KnowledgeDocument,
  KnowledgeDocumentSummary,
  Order,
  OrderItem,
  Product,
} from "@/types/api";

export type ApiErrorKind =
  | "network"
  | "timeout"
  | "not_found"
  | "validation"
  | "rate_limited"
  | "daily_limit"
  | "server"
  | "contract";

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Chưa kết nối được máy chủ. Hãy kiểm tra backend rồi thử lại.",
  timeout: "Máy chủ phản hồi quá lâu. Hãy thử lại.",
  not_found: "Không tìm thấy dữ liệu.",
  validation: "Nội dung gửi đi chưa hợp lệ. Hãy kiểm tra lại.",
  rate_limited: "Bạn đang gửi quá nhanh. Hãy đợi một lát rồi thử lại.",
  daily_limit: "Trợ lý AI đã hết lượt phục vụ trong hôm nay. Hãy quay lại vào ngày mai.",
  server: "Máy chủ đang gặp sự cố. Hãy thử lại sau ít phút.",
  contract: "Dữ liệu máy chủ trả về không đúng định dạng.",
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;

  constructor(kind: ApiErrorKind, status?: number, message?: string) {
    super(message ?? ERROR_MESSAGES[kind]);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

const GET_TIMEOUT_MS = 30_000;
const CHAT_TIMEOUT_MS = 90_000;

type Guard<T> = (value: unknown) => value is T;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function rateLimitMessage(seconds: number): string | undefined {
  if (!(seconds > 0)) return undefined;

  if (seconds > 300) {
    return `Bạn đã dùng hết lượt chat hôm nay. Hãy quay lại sau khoảng ${Math.ceil(seconds / 3600)} giờ.`;
  }

  return `Bạn đang gửi quá nhanh. Hãy thử lại sau ${seconds} giây.`;
}

function rateLimitError(response: Response): ApiError {
  const seconds = Number(response.headers.get("Retry-After"));
  return new ApiError("rate_limited", 429, rateLimitMessage(seconds));
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  guard: Guard<T>,
  { method = "GET", body, timeoutMs = GET_TIMEOUT_MS }: RequestOptions = {},
): Promise<T> {
  const baseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(
    /\/$/,
    "",
  );

  let response: Response;
  try {
    // The checksum must cover the exact string that goes on the wire.
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const timestamp = String(Date.now());

    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers:
        payload === undefined
          ? undefined
          : {
              "Content-Type": "application/json",
              "X-Request-Timestamp": timestamp,
              "X-Request-Checksum": await sha256Hex(
                `${payload}!~~${timestamp}~~!`,
              ),
            },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("timeout");
    }
    throw new ApiError("network");
  }

  if (!response.ok) {
    if (response.status === 404) throw new ApiError("not_found", 404);
    if (response.status === 400) throw new ApiError("validation", 400);
    if (response.status === 422) throw new ApiError("validation", 422);
    if (response.status === 429) throw rateLimitError(response);
    // Only the daily limit sends Retry-After with a 503.
    if (response.status === 503 && response.headers.has("Retry-After")) {
      throw new ApiError("daily_limit", 503);
    }
    throw new ApiError("server", response.status);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ApiError("contract", response.status);
  }

  if (!guard(data)) {
    throw new ApiError("contract", response.status);
  }

  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDecimal(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Number(value));
}

function listOf<T>(guard: Guard<T>): Guard<T[]> {
  return (value): value is T[] => Array.isArray(value) && value.every(guard);
}

const isProduct: Guard<Product> = (value): value is Product =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.sku === "string" &&
  typeof value.name === "string" &&
  isDecimal(value.price);

const isOrderItem: Guard<OrderItem> = (value): value is OrderItem =>
  isRecord(value) &&
  isProduct(value.product) &&
  typeof value.quantity === "number" &&
  isDecimal(value.unit_price);

const isOrder: Guard<Order> = (value): value is Order =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.status === "string" &&
  typeof value.created_at === "string" &&
  (value.delivered_at === null || typeof value.delivered_at === "string") &&
  listOf(isOrderItem)(value.items);

const isChatSource: Guard<ChatSource> = (value): value is ChatSource =>
  isRecord(value) &&
  typeof value.document_id === "string" &&
  typeof value.title === "string" &&
  typeof value.chunk_index === "number" &&
  typeof value.similarity === "number";

const isChatResponse: Guard<ChatResponse> = (value): value is ChatResponse =>
  isRecord(value) &&
  typeof value.answer === "string" &&
  listOf(isChatSource)(value.sources) &&
  listOf((tool): tool is string => typeof tool === "string")(value.tools_used);

const isDocumentSummary: Guard<KnowledgeDocumentSummary> = (
  value,
): value is KnowledgeDocumentSummary =>
  isRecord(value) &&
  typeof value.slug === "string" &&
  typeof value.document_id === "string" &&
  typeof value.title === "string" &&
  typeof value.doc_type === "string" &&
  typeof value.preview === "string";

const isDocument: Guard<KnowledgeDocument> = (
  value,
): value is KnowledgeDocument =>
  isRecord(value) &&
  typeof value.slug === "string" &&
  typeof value.document_id === "string" &&
  typeof value.title === "string" &&
  typeof value.doc_type === "string" &&
  typeof value.content === "string";

const isHealth: Guard<{ status: string }> = (
  value,
): value is { status: string } =>
  isRecord(value) && typeof value.status === "string";

export const api = {
  health: () => request("/health", isHealth),

  listOrders: (limit: number, offset: number) =>
    request(`/api/v1/orders?limit=${limit}&offset=${offset}`, listOf(isOrder)),

  getOrder: (orderId: string) =>
    request(`/api/v1/orders/${encodeURIComponent(orderId)}`, isOrder),

  listProducts: (limit: number, offset: number) =>
    request(
      `/api/v1/products?limit=${limit}&offset=${offset}`,
      listOf(isProduct),
    ),

  getProduct: (productId: string) =>
    request(`/api/v1/products/${encodeURIComponent(productId)}`, isProduct),

  listDocuments: () =>
    request("/api/v1/knowledge/documents", listOf(isDocumentSummary)),

  getDocument: (slug: string) =>
    request(
      `/api/v1/knowledge/documents/${encodeURIComponent(slug)}`,
      isDocument,
    ),

  sendChat: (sessionId: string, message: string) =>
    request("/api/v1/chat", isChatResponse, {
      method: "POST",
      body: { session_id: sessionId, message },
      timeoutMs: CHAT_TIMEOUT_MS,
    }),
};

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (!(error instanceof ApiError)) return false;
  return ["network", "timeout", "server"].includes(error.kind);
}
