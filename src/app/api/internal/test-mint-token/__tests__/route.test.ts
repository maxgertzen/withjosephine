import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenToken", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth/listenToken")>(
      "@/lib/auth/listenToken",
    );
  return {
    ...actual,
    mintListenToken: vi.fn(),
  };
});
vi.mock("@/lib/auth/listenSession", () => ({
  writeAudit: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
}));

import { writeAudit } from "@/lib/auth/listenSession";
import { mintListenToken } from "@/lib/auth/listenToken";

const mintMock = vi.mocked(mintListenToken);
const auditMock = vi.mocked(writeAudit);

const MINTED_TOKEN = "payload.signature";

beforeEach(() => {
  mintMock.mockReset().mockResolvedValue(MINTED_TOKEN);
  auditMock.mockReset().mockResolvedValue(undefined);
  vi.stubEnv("ADMIN_API_KEY", "test-admin-token");
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
    "https://withjosephine.com/api/internal/test-mint-token",
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

const validBody = {
  submissionId: "sub_123",
  recipientUserId: "user_456",
  mintSource: "cron_day7",
};

describe("POST /api/internal/test-mint-token", () => {
  describe("auth", () => {
    it("returns 404 when x-admin-token header missing", async () => {
      const res = await callRoute({ body: validBody });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when x-admin-token header is wrong", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "wrong-token" },
        body: validBody,
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("writes an admin_auth_failed audit row on auth failure", async () => {
      await callRoute({
        headers: { "x-admin-token": "wrong-token" },
        body: validBody,
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
        body: validBody,
      });
      expect(res.status).toBe(404);
    });

    it("returns 404 on production worker regardless of ADMIN_API_KEY (hard gate)", async () => {
      vi.stubEnv("ENVIRONMENT", "production");
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: validBody,
      });
      expect(res.status).toBe(404);
      expect(await res.text()).toBe("");
      expect(auditMock).not.toHaveBeenCalled();
      expect(mintMock).not.toHaveBeenCalled();
    });
  });

  describe("body validation", () => {
    it("returns 404 when body is malformed JSON", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        rawBody: "{not-json",
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when submissionId is missing", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { recipientUserId: "u", mintSource: "cron_day7" },
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when recipientUserId is missing", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { submissionId: "s", mintSource: "cron_day7" },
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when mintSource is missing", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { submissionId: "s", recipientUserId: "u" },
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when mintSource is not in the allowed set", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { ...validBody, mintSource: "invalid_source" },
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });

    it("returns 404 when ttlMs is non-numeric", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { ...validBody, ttlMs: "not-a-number" },
      });
      expect(res.status).toBe(404);
      expect(mintMock).not.toHaveBeenCalled();
    });
  });

  describe("happy path", () => {
    it("returns 200 with the minted token", async () => {
      const res = await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: validBody,
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as { token: string };
      expect(json.token).toBe(MINTED_TOKEN);
    });

    it("forwards submissionId, recipientUserId, mintSource to mintListenToken", async () => {
      await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: validBody,
      });
      expect(mintMock).toHaveBeenCalledWith({
        submissionId: "sub_123",
        recipientUserId: "user_456",
        mintSource: "cron_day7",
        ttlMs: undefined,
      });
    });

    it("forwards admin_resend mintSource", async () => {
      await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { ...validBody, mintSource: "admin_resend" },
      });
      expect(mintMock).toHaveBeenCalledWith(
        expect.objectContaining({ mintSource: "admin_resend" }),
      );
    });

    it("forwards negative ttlMs verbatim (expired-token-for-spec case)", async () => {
      await callRoute({
        headers: { "x-admin-token": "test-admin-token" },
        body: { ...validBody, ttlMs: -1 },
      });
      expect(mintMock).toHaveBeenCalledWith(
        expect.objectContaining({ ttlMs: -1 }),
      );
    });
  });
});
