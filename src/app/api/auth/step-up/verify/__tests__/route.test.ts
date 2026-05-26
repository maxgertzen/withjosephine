import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
}));

const getActiveSessionMock = vi.fn();
vi.mock("@/lib/auth/listenSession", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/listenSession")>(
    "@/lib/auth/listenSession",
  );
  return { ...actual, getActiveSession: getActiveSessionMock };
});

const verifyStepUpOtpMock = vi.fn();
vi.mock("@/lib/auth/stepUpOtp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/stepUpOtp")>(
    "@/lib/auth/stepUpOtp",
  );
  return { ...actual, verifyStepUpOtp: verifyStepUpOtpMock };
});

const getRequestAuditContextMock = vi.fn();
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: getRequestAuditContextMock,
}));

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  verifyStepUpOtpMock.mockReset();
  getRequestAuditContextMock
    .mockReset()
    .mockResolvedValue({ ipHash: "ip-hash", userAgentHash: "ua-hash" });
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/auth/step-up/verify", {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/step-up/verify", () => {
  it("returns 401 without session cookie", async () => {
    cookieGetMock.mockReturnValueOnce(undefined);
    const res = await callRoute({ code: "123456" });
    expect(res.status).toBe(401);
    expect(verifyStepUpOtpMock).not.toHaveBeenCalled();
  });

  it("returns 401 with no active session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    const res = await callRoute({ code: "123456" });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is missing code", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "u",
      sessionId: "s",
      elevatedAt: null,
    });
    const res = await callRoute({});
    expect(res.status).toBe(400);
    expect(verifyStepUpOtpMock).not.toHaveBeenCalled();
  });

  it("returns 400 when code is not 6 digits", async () => {
    // Use mockResolvedValue (not Once) so every iteration of the loop sees a session.
    getActiveSessionMock.mockResolvedValue({
      userId: "u",
      sessionId: "s",
      elevatedAt: null,
    });
    for (const bad of ["12345", "1234567", "abcdef", "12 456", ""]) {
      const res = await callRoute({ code: bad });
      expect(res.status).toBe(400);
    }
    expect(verifyStepUpOtpMock).not.toHaveBeenCalled();
  });

  it("returns 400 when code is not a string", async () => {
    getActiveSessionMock.mockResolvedValue({
      userId: "u",
      sessionId: "s",
      elevatedAt: null,
    });
    const res = await callRoute({ code: 123456 });
    expect(res.status).toBe(400);
  });

  it("returns 200 + elevatedAt on success", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "u",
      sessionId: "s",
      elevatedAt: null,
    });
    verifyStepUpOtpMock.mockResolvedValueOnce({ ok: true, elevatedAt: 1234567890 });
    const res = await callRoute({ code: "123456" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ elevatedAt: 1234567890 });
    expect(verifyStepUpOtpMock).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "123456",
        userId: "u",
        sessionId: "s",
        ipHash: "ip-hash",
        userAgentHash: "ua-hash",
      }),
    );
  });

  it.each([
    "no_pending",
    "expired",
    "already_consumed",
    "mismatch",
    "poisoned",
  ] as const)("returns 422 + contactMailto on OTP failure reason %s", async (reason) => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "u",
      sessionId: "s",
      elevatedAt: null,
    });
    verifyStepUpOtpMock.mockResolvedValueOnce({ ok: false, reason });
    const res = await callRoute({ code: "123456" });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { reason: string; contactMailto: string };
    expect(body.reason).toBe(reason);
    expect(body.contactMailto).toMatch(/^mailto:hello@withjosephine\.com/);
  });
});
