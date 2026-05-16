import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/users", () => ({
  findUserByEmail: vi.fn(),
}));
vi.mock("@/lib/auth/listenSession", () => ({
  issueMagicLink: vi.fn(),
  writeAudit: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
}));
vi.mock("@/lib/resend", () => ({
  sendMagicLink: vi.fn(),
}));

import { issueMagicLink, writeAudit } from "@/lib/auth/listenSession";
import { findUserByEmail } from "@/lib/auth/users";
import { sendMagicLink } from "@/lib/resend";

const findUserMock = vi.mocked(findUserByEmail);
const issueMock = vi.mocked(issueMagicLink);
const auditMock = vi.mocked(writeAudit);
const sendMagicLinkMock = vi.mocked(sendMagicLink);

const VALID_TOKEN = "abcdef0123456789".repeat(4); // 64 hex chars
const VALID_EXPIRES = Date.now() + 24 * 60 * 60 * 1000;

beforeEach(() => {
  findUserMock.mockReset();
  issueMock
    .mockReset()
    .mockResolvedValue({ token: VALID_TOKEN, expiresAt: VALID_EXPIRES });
  auditMock.mockReset().mockResolvedValue(undefined);
  sendMagicLinkMock.mockReset();
  vi.stubEnv("ADMIN_API_KEY", "test-admin-token");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://withjosephine.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(init: {
  headers?: Record<string, string>;
  body?: unknown;
  rawBody?: string;
}): Promise<Response> {
  const { POST } = await import("../route");
  const req = new Request(
    "https://withjosephine.com/api/internal/issue-magic-link",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
      body:
        init.rawBody !== undefined
          ? init.rawBody
          : init.body === undefined
            ? undefined
            : JSON.stringify(init.body),
    },
  );
  return POST(req);
}

describe("POST /api/internal/issue-magic-link", () => {
  describe("auth", () => {
    it("returns 404 when x-admin-token header missing", async () => {
      const res = await callRoute({ body: { email: "ada@example.com" } });
      expect(res.status).toBe(404);
      expect(issueMock).not.toHaveBeenCalled();
    });

    it("returns 404 when x-admin-token header is wrong", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "wrong-token" },
        body: { email: "ada@example.com" },
      });
      expect(res.status).toBe(404);
      expect(issueMock).not.toHaveBeenCalled();
    });

    it("writes an admin_auth_failed audit row on auth failure", async () => {
      await callRoute({
        headers: { "x-admin-token": "wrong-token" },
        body: { email: "ada@example.com" },
      });
      expect(auditMock).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "admin_auth_failed",
          success: false,
          userId: null,
        }),
      );
    });

    it("returns 404 when ADMIN_API_KEY env is absent (no leak)", async () => {
      vi.stubEnv("ADMIN_API_KEY", "");
      const res = await callRoute({
        headers: { "x-admin-token": "anything" },
        body: { email: "ada@example.com" },
      });
      expect(res.status).toBe(404);
    });
  });

  describe("body validation", () => {
    it("returns 404 when body is malformed JSON", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        rawBody: "{not-json",
      });
      expect(res.status).toBe(404);
      expect(issueMock).not.toHaveBeenCalled();
    });

    it("returns 404 when email field is missing", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: {},
      });
      expect(res.status).toBe(404);
      expect(issueMock).not.toHaveBeenCalled();
    });

    it("returns 404 when email field is empty string", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "" },
      });
      expect(res.status).toBe(404);
      expect(issueMock).not.toHaveBeenCalled();
    });
  });

  describe("unknown email — no enumeration leak", () => {
    it("returns 404 with same shape as auth-fail when email has no user row", async () => {
      findUserMock.mockResolvedValueOnce(null);
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "ghost@example.com" },
      });
      expect(res.status).toBe(404);
      // Same empty body shape as auth-fail; an external probe can't tell the
      // two failure modes apart.
      expect(await res.text()).toBe("");
      expect(issueMock).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("returns 200 + token + verifyUrl + expiresAt for valid request", async () => {
      findUserMock.mockResolvedValueOnce({ id: "user_1", email: "ada@example.com" });
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "ada@example.com" },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        token: string;
        verifyUrl: string;
        expiresAt: number;
      };
      expect(body.token).toMatch(/^[a-f0-9]{64}$/);
      expect(body.verifyUrl).toBe(
        `https://withjosephine.com/auth/verify?token=${VALID_TOKEN}`,
      );
      expect(body.expiresAt).toBe(VALID_EXPIRES);
    });

    it("calls issueMagicLink (no reimplementation) attributed to the user", async () => {
      findUserMock.mockResolvedValueOnce({ id: "user_1", email: "ada@example.com" });
      await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "ada@example.com" },
      });
      expect(issueMock).toHaveBeenCalledWith({
        userId: "user_1",
        ipHash: "ip-h",
      });
    });

    it("does not call sendMagicLink (no Resend dispatch from this route)", async () => {
      findUserMock.mockResolvedValueOnce({ id: "user_1", email: "ada@example.com" });
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "ada@example.com" },
      });
      expect(res.status).toBe(200);
      expect(sendMagicLinkMock).not.toHaveBeenCalled();
    });

    it("does NOT write admin_auth_failed audit row on success path", async () => {
      // The `link_issued` audit row is written by the underlying
      // issueMagicLink helper (which we have mocked here), so we only assert
      // the negative — the route's own auth-fail audit branch did not fire.
      findUserMock.mockResolvedValueOnce({ id: "user_1", email: "ada@example.com" });
      await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { email: "ada@example.com" },
      });
      const authFailedCalls = auditMock.mock.calls.filter(
        (call) => call[0].eventType === "admin_auth_failed",
      );
      expect(authFailedCalls).toHaveLength(0);
    });
  });
});
