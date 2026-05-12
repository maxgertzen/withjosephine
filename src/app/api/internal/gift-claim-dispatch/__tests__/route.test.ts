import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/giftClaimDispatch", () => ({
  dispatchGiftClaim: vi.fn(),
}));

import { dispatchGiftClaim } from "@/lib/booking/giftClaimDispatch";

const mockDispatch = vi.mocked(dispatchGiftClaim);

beforeEach(() => {
  mockDispatch.mockReset();
  vi.stubEnv("DO_DISPATCH_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(init: { headers?: Record<string, string>; body?: unknown }): Promise<Response> {
  const { POST } = await import("../route");
  const req = new Request("http://localhost/api/internal/gift-claim-dispatch", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return POST(req);
}

describe("/api/internal/gift-claim-dispatch", () => {
  it("returns 401 when secret header missing", async () => {
    const res = await callRoute({ body: { submissionId: "sub_1", retryCount: 0 } });
    expect(res.status).toBe(401);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("returns 401 when secret header mismatches", async () => {
    const res = await callRoute({
      headers: { "x-do-secret": "wrong" },
      body: { submissionId: "sub_1", retryCount: 0 },
    });
    expect(res.status).toBe(401);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("returns 400 when body malformed", async () => {
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "", retryCount: -1 },
    });
    expect(res.status).toBe(400);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("delegates to dispatchGiftClaim and returns its outcome on the happy path", async () => {
    mockDispatch.mockResolvedValueOnce({
      outcome: "first_send",
      nextAlarmMs: 1_700_000_000_000,
    });
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_1", retryCount: 0 },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      outcome: "first_send",
      nextAlarmMs: 1_700_000_000_000,
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ submissionId: "sub_1", retryCount: 0 }),
    );
  });

  it("returns the stop outcome from the dispatcher unchanged", async () => {
    mockDispatch.mockResolvedValueOnce({
      outcome: "stop",
      reason: "claimed",
      nextAlarmMs: null,
    });
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_1", retryCount: 2 },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      outcome: "stop",
      reason: "claimed",
      nextAlarmMs: null,
    });
  });
});
