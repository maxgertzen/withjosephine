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

const findUserByIdMock = vi.fn();
vi.mock("@/lib/auth/users", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/users")>("@/lib/auth/users");
  return { ...actual, findUserById: findUserByIdMock };
});

const issueStepUpOtpMock = vi.fn();
vi.mock("@/lib/auth/stepUpOtp", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/stepUpOtp")>(
    "@/lib/auth/stepUpOtp",
  );
  return { ...actual, issueStepUpOtp: issueStepUpOtpMock };
});

const sendStepUpOtpEmailMock = vi.fn();
vi.mock("@/lib/resend", () => ({ sendStepUpOtpEmail: sendStepUpOtpEmailMock }));

const getRequestAuditContextMock = vi.fn();
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: getRequestAuditContextMock,
}));

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  findUserByIdMock.mockReset();
  issueStepUpOtpMock.mockReset();
  sendStepUpOtpEmailMock.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_1" });
  getRequestAuditContextMock
    .mockReset()
    .mockResolvedValue({ ipHash: "ip-hash", userAgentHash: "ua-hash" });
});

async function callRoute(opts: { headers?: Record<string, string> } = {}): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/auth/step-up/request", {
      method: "POST",
      headers: opts.headers,
    }),
  );
}

describe("POST /api/auth/step-up/request", () => {
  it("returns 401 without session cookie", async () => {
    cookieGetMock.mockReturnValueOnce(undefined);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("returns 401 when cookie has no active session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("returns 404 + clears cookie when session.userId no longer maps to a user", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_ghost",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce(null);
    const res = await callRoute();
    expect(res.status).toBe(404);
    // Use getSetCookie (returns string[]) because Web Fetch's get("Set-Cookie")
    // is unreliable under vitest's undici polyfill.
    const cookies = res.headers.getSetCookie();
    expect(cookies.length).toBeGreaterThanOrEqual(1);
    expect(cookies.join(",")).toContain("__Host-listen_session=");
    expect(cookies.join(",")).toContain("Max-Age=0");
    expect(issueStepUpOtpMock).not.toHaveBeenCalled();
  });

  it("returns 200 + empty body and sends the email on success", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_1",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce({ id: "user_1", email: "alice@example.com" });
    issueStepUpOtpMock.mockResolvedValueOnce({ ok: true, code: "123456", expiresAt: 999 });

    const res = await callRoute();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({});

    expect(sendStepUpOtpEmailMock).toHaveBeenCalledWith({
      code: "123456",
      toEmail: "alice@example.com",
      ipHash: "ip-hash",
      dryRunHeader: null,
    });
  });

  it("returns 429 + Retry-After header on throttled_gap", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_1",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce({ id: "user_1", email: "alice@example.com" });
    issueStepUpOtpMock.mockResolvedValueOnce({
      ok: false,
      reason: "throttled_gap",
      retryAfterSec: 25,
    });

    const res = await callRoute();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("25");
    const body = (await res.json()) as { reason: string; retryAfterSec: number };
    expect(body.reason).toBe("throttled_gap");
    expect(body.retryAfterSec).toBe(25);
    expect(sendStepUpOtpEmailMock).not.toHaveBeenCalled();
  });

  it("returns 429 on throttled_cap", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_1",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce({ id: "user_1", email: "alice@example.com" });
    issueStepUpOtpMock.mockResolvedValueOnce({
      ok: false,
      reason: "throttled_cap",
      retryAfterSec: 600,
    });
    const res = await callRoute();
    expect(res.status).toBe(429);
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toBe("throttled_cap");
  });

  it("returns devCode when X-E2E-Resend-DryRun header is present (sandbox capture path)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_1",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce({ id: "user_1", email: "alice@example.com" });
    issueStepUpOtpMock.mockResolvedValueOnce({ ok: true, code: "424242", expiresAt: 999 });
    // Sender reports skipped/dry-run when header is honored; route surfaces
    // devCode either way (header presence is the discriminator).
    sendStepUpOtpEmailMock.mockResolvedValueOnce({ kind: "skipped" });

    const res = await callRoute({ headers: { "x-e2e-resend-dry-run": "secret-value" } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { devCode: string };
    expect(body.devCode).toBe("424242");

    expect(sendStepUpOtpEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ dryRunHeader: "secret-value" }),
    );
  });

  it("returns devCode when the email path skips (sandbox prefix on recipient)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: "user_1",
      sessionId: "s",
      elevatedAt: null,
    });
    findUserByIdMock.mockResolvedValueOnce({
      id: "user_1",
      email: "maxgertzen+sandbox@gmail.com",
    });
    issueStepUpOtpMock.mockResolvedValueOnce({ ok: true, code: "555000", expiresAt: 999 });
    sendStepUpOtpEmailMock.mockResolvedValueOnce({ kind: "skipped" });

    const res = await callRoute();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ devCode: "555000" });
  });
});
