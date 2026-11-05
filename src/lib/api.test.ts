import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { api, ApiError, shouldRetry } from "@/lib/api";
import { formatVnd, orderTotal, parsePage } from "@/lib/format";
import type { Order } from "@/types/api";

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function kindOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  return (error as ApiError).kind;
}

describe("api errors", () => {
  it.each([
    [404, "not_found"],
    [422, "validation"],
    [500, "server"],
    [503, "server"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    stubFetch(status, { detail: "secret traceback" });
    expect(await kindOf(api.getOrder("ORD-1"))).toBe(kind);
  });

  it("maps a rejected fetch to network", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));
    expect(await kindOf(api.health())).toBe("network");
  });

  it("maps an aborted fetch to timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("t", "TimeoutError")),
    );
    expect(await kindOf(api.health())).toBe("timeout");
  });

  it("rejects a response that breaks the contract", async () => {
    stubFetch(200, [{ id: "ORD-1" }]);
    expect(await kindOf(api.listOrders(10, 0))).toBe("contract");
  });

  it("never exposes backend detail in the message", async () => {
    stubFetch(500, { detail: "secret traceback" });
    const error = await api.health().catch((e: unknown) => e);
    expect((error as Error).message).not.toContain("secret");
  });

  it("retries only temporary failures", () => {
    expect(shouldRetry(0, new ApiError("network"))).toBe(true);
    expect(shouldRetry(2, new ApiError("network"))).toBe(false);
    expect(shouldRetry(0, new ApiError("not_found"))).toBe(false);
    expect(shouldRetry(0, new ApiError("contract"))).toBe(false);
  });
});

describe("chat request", () => {
  const ANSWER = { answer: "a", sources: [], tools_used: [] };

  it("signs the exact body plus the timestamp, including Vietnamese text", async () => {
    const fetchMock = stubFetch(200, ANSWER);

    await api.sendChat("session-1", "Đơn ORD-0002 hủy được không? ✓");

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    const headers = init.headers as Record<string, string>;
    const timestamp = headers["X-Request-Timestamp"];
    expect(Math.abs(Date.now() - Number(timestamp))).toBeLessThan(5000);
    expect(headers["X-Request-Checksum"]).toBe(
      createHash("sha256")
        .update(`${init.body}!~~${timestamp}~~!`, "utf8")
        .digest("hex"),
    );
  });

  it("does not add a checksum to GET requests", async () => {
    const fetchMock = stubFetch(200, { status: "ok" });

    await api.health();

    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).toBeUndefined();
  });

  it("tells the user how long to wait on 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", { status: 429, headers: { "Retry-After": "42" } }),
      ),
    );

    const error = await api.sendChat("s", "m").catch((e: unknown) => e);

    expect((error as ApiError).kind).toBe("rate_limited");
    expect((error as ApiError).message).toContain("42 giây");
    expect(shouldRetry(0, error)).toBe(false);
  });

  it("explains when the personal daily limit is used up", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", { status: 429, headers: { "Retry-After": "7200" } }),
      ),
    );

    const error = await api.sendChat("s", "m").catch((e: unknown) => e);

    expect((error as ApiError).message).toContain("hết lượt chat hôm nay");
    expect((error as ApiError).message).toContain("2 giờ");
  });

  it("separates the shared daily limit from an agent failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("{}", { status: 503, headers: { "Retry-After": "7200" } }),
      ),
    );
    const limited = await api.sendChat("s", "m").catch((e: unknown) => e);
    expect((limited as ApiError).kind).toBe("daily_limit");
    expect(shouldRetry(0, limited)).toBe(false);

    stubFetch(503, {});
    expect(await kindOf(api.sendChat("s", "m"))).toBe("server");
  });

  it("does not retry GET requests that were rate limited", () => {
    expect(shouldRetry(0, new ApiError("rate_limited", 429))).toBe(false);
  });

  it("uses a general message when 429 has no Retry-After", async () => {
    stubFetch(429, {});
    const error = await api.sendChat("s", "m").catch((e: unknown) => e);
    expect((error as ApiError).message).toContain("đợi một lát");
  });

  it("treats a rejected checksum as a validation error", async () => {
    stubFetch(400, { detail: "Body checksum mismatch" });
    expect(await kindOf(api.sendChat("s", "m"))).toBe("validation");
  });
});

describe("session start", () => {
  it("accepts an empty 204 response and sends a checksum", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.startSession("/orders", "")).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/v1/session/start");
    expect(JSON.parse(String(init.body))).toEqual({ path: "/orders", referrer: "" });
    expect(init.headers).toHaveProperty("X-Request-Checksum");
  });
});

describe("format", () => {
  const order: Order = {
    id: "ORD-1",
    status: "pending",
    created_at: "2026-10-23T14:05:27Z",
    delivered_at: null,
    items: [
      {
        product: { id: 1, sku: "A", name: "A", price: "999999.00" },
        quantity: 2,
        unit_price: "100000.00",
      },
      {
        product: { id: 2, sku: "B", name: "B", price: "1.00" },
        quantity: 1,
        unit_price: "50000.50",
      },
    ],
  };

  it("totals from unit_price, not the current product price", () => {
    expect(orderTotal(order)).toBe(250000.5);
  });

  it("formats VND without decimals", () => {
    expect(formatVnd("570000.00").replace(/\s/g, " ")).toBe("570.000 ₫");
  });

  it("falls back to page 1 for bad values", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(null)).toBe(1);
  });
});
