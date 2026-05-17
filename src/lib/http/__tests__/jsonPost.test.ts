import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { jsonPost } from "../jsonPost";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("jsonPost", () => {
  it("returns ok=true with parsed data on 200", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "abc" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const result = await jsonPost<{ id: string }>("/api/x", { a: 1 });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: "abc" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/x");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
    expect(JSON.parse(init.body as string)).toEqual({ a: 1 });
  });

  it("sends POST with no body or headers when body is omitted", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    await jsonPost("/api/y");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
    expect(init.headers).toBeUndefined();
  });

  it("returns ok=false with fieldErrors map on 422", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          fieldErrors: [
            { field: "recipientName", message: "Required" },
            { field: "recipientEmail", message: "Invalid email" },
          ],
        }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await jsonPost("/api/x", {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
    expect(result.fieldErrors).toEqual({
      recipientName: "Required",
      recipientEmail: "Invalid email",
    });
  });

  it("returns rate_limited topError on 429", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    const result = await jsonPost("/api/x", {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.topError).toBe("rate_limited");
  });

  it("returns network topError when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    const result = await jsonPost("/api/x", {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.topError).toBe("network");
  });

  it("returns http_N topError on other non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));
    const result = await jsonPost("/api/x", {});
    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.topError).toBe("http_500");
  });
});
