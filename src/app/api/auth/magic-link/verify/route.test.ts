import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  redeemMagicLink: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn().mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
  getClientIpKey: vi.fn().mockReturnValue("1.2.3.4"),
}));

import { redeemMagicLink } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";

const redeemMock = vi.mocked(redeemMagicLink);
const rateLimitMock = vi.mocked(checkRateLimit);

beforeEach(() => {
  redeemMock.mockReset();
  rateLimitMock.mockReset().mockResolvedValue(true);
});

function form(values: Record<string, string>): Request {
  const body = new URLSearchParams(values).toString();
  return new Request("https://withjosephine.com/api/auth/magic-link/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

describe("POST /api/auth/magic-link/verify", () => {
  it("on success: sets __Host- cookie, 303 redirects to /my-readings", async () => {
    redeemMock.mockResolvedValue({
      ok: true,
      userId: "user_1",
      sessionId: "sess_1",
      cookieValue: "raw-cookie-value",
    });
    const { POST } = await import("./route");
    const response = await POST(form({ token: "abc", email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings");
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-listen_session=raw-cookie-value");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=604800");
  });

  it("redirects to a safe `next` path when supplied", async () => {
    redeemMock.mockResolvedValue({
      ok: true,
      userId: "user_1",
      sessionId: "sess_1",
      cookieValue: "raw",
    });
    const { POST } = await import("./route");
    const response = await POST(
      form({ token: "abc", email: "ada@example.com", next: "/listen/sub_42" }),
    );
    expect(response.headers.get("location")).toBe("https://withjosephine.com/listen/sub_42");
  });

  it("clamps unsafe `next` paths to /my-readings", async () => {
    redeemMock.mockResolvedValue({
      ok: true,
      userId: "user_1",
      sessionId: "sess_1",
      cookieValue: "raw",
    });
    const { POST } = await import("./route");
    const response = await POST(
      form({ token: "abc", email: "ada@example.com", next: "https://evil.example.com" }),
    );
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings");
  });

  it("on email mismatch: 303 redirects to /auth/verify?error=rested, no cookie", async () => {
    redeemMock.mockResolvedValue({ ok: false, reason: "email_mismatch" });
    const { POST } = await import("./route");
    const response = await POST(form({ token: "abc", email: "wrong@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/verify?error=rested",
    );
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("on expired token: redirects to /auth/verify?error=rested", async () => {
    redeemMock.mockResolvedValue({ ok: false, reason: "expired" });
    const { POST } = await import("./route");
    const response = await POST(form({ token: "abc", email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/verify?error=rested",
    );
  });

  it("on already-consumed: redirects to /auth/verify?error=rested", async () => {
    redeemMock.mockResolvedValue({ ok: false, reason: "already_consumed" });
    const { POST } = await import("./route");
    const response = await POST(form({ token: "abc", email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/verify?error=rested",
    );
  });

  it("missing token: redirects to /auth/verify?error=rested", async () => {
    const { POST } = await import("./route");
    const response = await POST(form({ email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(redeemMock).not.toHaveBeenCalled();
  });

  it("rate-limited: redirects to /auth/verify?error=rested without redeem", async () => {
    rateLimitMock.mockResolvedValue(false);
    const { POST } = await import("./route");
    const response = await POST(form({ token: "abc", email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/verify?error=rested",
    );
    expect(redeemMock).not.toHaveBeenCalled();
  });
});
