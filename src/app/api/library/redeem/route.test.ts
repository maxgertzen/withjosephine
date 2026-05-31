import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  createListenSessionForUser: vi.fn(),
  writeAudit: vi.fn(),
  buildListenSessionCookieHeader: (value: string) =>
    `__Host-listen_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`,
  AUDIT_EVENT_TYPE: {
    library_token_redeemed: "library_token_redeemed",
  },
}));
vi.mock("@/lib/auth/libraryToken", () => ({
  verifyLibraryToken: vi.fn(),
  LIBRARY_TOKEN_TTL_MS: 365 * 24 * 60 * 60 * 1000,
}));
vi.mock("@/lib/auth/libraryTokenRedemptions", () => ({
  recordLibraryTokenRedemption: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn().mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
}));
vi.mock("@/lib/auth/users", () => ({
  findUserById: vi.fn(),
}));

import { verifyLibraryToken } from "@/lib/auth/libraryToken";
import { recordLibraryTokenRedemption } from "@/lib/auth/libraryTokenRedemptions";
import { createListenSessionForUser, writeAudit } from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";

const verifyMock = vi.mocked(verifyLibraryToken);
const recordMock = vi.mocked(recordLibraryTokenRedemption);
const sessionMock = vi.mocked(createListenSessionForUser);
const auditMock = vi.mocked(writeAudit);
const findUserMock = vi.mocked(findUserById);

beforeEach(() => {
  verifyMock.mockReset();
  recordMock.mockReset();
  sessionMock.mockReset();
  auditMock.mockReset();
  findUserMock.mockReset();
});

function mockUserExists(id = "user_1") {
  findUserMock.mockResolvedValue({ id, email: "ada@example.com" });
}

function form(values: Record<string, string>): Request {
  const body = new URLSearchParams(values).toString();
  return new Request("https://withjosephine.com/api/library/redeem", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function invoke(request: Request) {
  const { POST } = await import("./route");
  return POST(request);
}

describe("POST /api/library/redeem", () => {
  it("valid token POST -> 303 redirect to /my-readings?welcome=1, Set-Cookie present", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      userId: "user_1",
      jti: "jti-abc",
      mintSource: "order_confirmation",
      expMs: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    mockUserExists("user_1");
    recordMock.mockResolvedValue({ ok: true });
    sessionMock.mockResolvedValue({
      sessionId: "sess_1",
      cookieValue: "raw-cookie-value",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = await invoke(form({ t: "valid.token" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/my-readings?welcome=1",
    );
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: "jti-abc",
        userId: "user_1",
        mintSource: "order_confirmation",
      }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-listen_session=raw-cookie-value");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=604800");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        eventType: "library_token_redeemed",
        success: true,
      }),
    );
  });

  it("same token POSTed twice (second is already_redeemed) -> 303 fallback, no cookie", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      userId: "user_1",
      jti: "jti-abc",
      mintSource: "order_confirmation",
      expMs: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    mockUserExists("user_1");
    recordMock.mockResolvedValue({ ok: false, reason: "already_redeemed" });

    const response = await invoke(form({ t: "valid.token" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it("missing token: 303 fallback, no verify call", async () => {
    const response = await invoke(form({}));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings");
    expect(verifyMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("invalid token (expired/bad-sig): 303 fallback, no cookie", async () => {
    verifyMock.mockResolvedValue({ valid: false, reason: "expired" });
    const response = await invoke(form({ t: "expired.token" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("malformed token: 303 fallback, no record call", async () => {
    verifyMock.mockResolvedValue({ valid: false, reason: "malformed" });
    const response = await invoke(form({ t: "garbage" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("valid token but user_id has been deleted: 303 fallback, no session created", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      userId: "user_deleted",
      jti: "jti-abc",
      mintSource: "order_confirmation",
      expMs: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    findUserMock.mockResolvedValue(null);

    const response = await invoke(form({ t: "valid.token.for.deleted.user" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(recordMock).not.toHaveBeenCalled();
    expect(sessionMock).not.toHaveBeenCalled();
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("success response sets Clear-Site-Data: cache to break bfcache snapshot", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      userId: "user_1",
      jti: "jti-abc",
      mintSource: "order_confirmation",
      expMs: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });
    mockUserExists("user_1");
    recordMock.mockResolvedValue({ ok: true });
    sessionMock.mockResolvedValue({
      sessionId: "sess_1",
      cookieValue: "raw-cookie-value",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = await invoke(form({ t: "valid.token" }));

    expect(response.headers.get("clear-site-data")).toBe('"cache"');
  });
});
