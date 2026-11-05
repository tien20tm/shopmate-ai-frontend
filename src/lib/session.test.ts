import { describe, expect, it, vi } from "vitest";

import { reportSessionStart } from "@/lib/session";

function stubFetch(result: () => Promise<Response>) {
  const fetchMock = vi.fn(result);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const noContent = async () => new Response(null, { status: 204 });

describe("reportSessionStart", () => {
  it("reports once per tab", async () => {
    const fetchMock = stubFetch(noContent);

    reportSessionStart();
    reportSessionStart();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    reportSessionStart();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends only the path and the referrer hostname", async () => {
    const fetchMock = stubFetch(noContent);
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://www.google.com/search?q=so+dien+thoai",
    );

    reportSessionStart();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(String(init.body))).toEqual({
      path: "/",
      referrer: "www.google.com",
    });
    vi.restoreAllMocks();
  });

  it("ignores failures", async () => {
    const fetchMock = stubFetch(() => Promise.reject(new TypeError("blocked")));

    expect(() => reportSessionStart()).not.toThrow();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });
});
