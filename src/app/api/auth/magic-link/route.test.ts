import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/users", () => ({
  findUserByEmail: vi.fn(),
}));
vi.mock("@/lib/auth/listenSession", () => ({
  issueMagicLink: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn().mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
  getClientIpKey: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("@/lib/resend", () => ({
  sendMagicLink: vi.fn().mockResolvedValue({ resendId: "msg_1" }),
}));

import { issueMagicLink } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { findUserByEmail } from "@/lib/auth/users";
import { sendMagicLink } from "@/lib/resend";

const findUserMock = vi.mocked(findUserByEmail);
const issueMock = vi.mocked(issueMagicLink);
const rateLimitMock = vi.mocked(checkRateLimit);
const sendMock = vi.mocked(sendMagicLink);

beforeEach(() => {
  findUserMock.mockReset();
  issueMock.mockReset().mockResolvedValue({ token: "tkn", expiresAt: 0 });
  rateLimitMock.mockReset().mockResolvedValue(true);
  sendMock.mockReset().mockResolvedValue({ resendId: "msg_1" });
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://withjosephine.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonRequest(body: unknown): Request {
  return new Request("https://withjosephine.com/api/auth/magic-link", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function formRequest(values: Record<string, string>): Request {
  const body = new URLSearchParams(values).toString();
  return new Request("https://withjosephine.com/api/auth/magic-link", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function flushFireAndForget() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("POST /api/auth/magic-link — JSON branch", () => {
  it("returns 204 and sends a magic link for known email", async () => {
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ email: "ada@example.com" }));
    expect(response.status).toBe(204);
    expect(issueMock).toHaveBeenCalledWith({ userId: "user_1", ipHash: "ip-h" });
    await flushFireAndForget();
    expect(sendMock).toHaveBeenCalledOnce();
    const sentUrl = sendMock.mock.calls[0]?.[0].magicLinkUrl ?? "";
    expect(sentUrl.startsWith("https://withjosephine.com/auth/verify?")).toBe(true);
  });

  it("returns 204 silently for unknown email (no enumeration leak)", async () => {
    findUserMock.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ email: "nobody@example.com" }));
    expect(response.status).toBe(204);
    expect(issueMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 204 silently when rate-limited", async () => {
    rateLimitMock.mockResolvedValue(false);
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    const response = await POST(jsonRequest({ email: "ada@example.com" }));
    expect(response.status).toBe(204);
    expect(findUserMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("forwards a safe `next` parameter into the verify URL", async () => {
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    await POST(jsonRequest({ email: "ada@example.com", next: "/listen/sub_123" }));
    await flushFireAndForget();
    const url = sendMock.mock.calls[0]?.[0].magicLinkUrl ?? "";
    expect(url).toContain("next=%2Flisten%2Fsub_123");
  });

  it("strips an unsafe `next` from the emailed link (pre-validates at send)", async () => {
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    await POST(jsonRequest({ email: "ada@example.com", next: "https://evil.example.com" }));
    await flushFireAndForget();
    const url = sendMock.mock.calls[0]?.[0].magicLinkUrl ?? "";
    expect(url).not.toContain("evil.example.com");
    expect(url).not.toContain("next=");
  });

  it("rejects invalid email (regex + length cap) without DB lookup", async () => {
    const { POST } = await import("./route");
    const cases = [
      "not-an-email",
      "<script>alert(1)</script>@example.com",
      "ada@",
      "@example.com",
      "ada example.com",
      "",
      "a".repeat(255) + "@example.com",
    ];
    for (const email of cases) {
      findUserMock.mockReset();
      sendMock.mockReset();
      const response = await POST(jsonRequest({ email }));
      expect(response.status).toBe(204);
      expect(findUserMock).not.toHaveBeenCalled();
      expect(sendMock).not.toHaveBeenCalled();
    }
  });

  it("survives malformed JSON without throwing", async () => {
    const malformed = new Request("https://withjosephine.com/api/auth/magic-link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json{",
    });
    const { POST } = await import("./route");
    const response = await POST(malformed);
    expect(response.status).toBe(204);
  });
});

describe("POST /api/auth/magic-link — form branch", () => {
  it("redirects 303 to /my-readings?sent=1 on success", async () => {
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    const response = await POST(formRequest({ email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings?sent=1");
    await flushFireAndForget();
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it("redirects to /my-readings?sent=1 even on unknown email (uniform UX)", async () => {
    findUserMock.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(formRequest({ email: "nobody@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings?sent=1");
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("redirects to /my-readings?sent=1 when rate-limited (silent throttle)", async () => {
    rateLimitMock.mockResolvedValue(false);
    findUserMock.mockResolvedValue({ id: "user_1", email: "ada@example.com" });
    const { POST } = await import("./route");
    const response = await POST(formRequest({ email: "ada@example.com" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/my-readings?sent=1");
    expect(findUserMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});
