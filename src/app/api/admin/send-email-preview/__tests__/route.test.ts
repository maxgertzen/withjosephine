import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emails/sendEmailPreview", () => ({
  sendEmailPreview: vi.fn(),
}));
vi.mock("@/lib/auth/listenSession", () => ({
  writeAudit: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn().mockResolvedValue({
    ipHash: "ip-h",
    userAgentHash: "ua-h",
  }),
}));

import { writeAudit } from "@/lib/auth/listenSession";
import { sendEmailPreview } from "@/lib/emails/sendEmailPreview";

const mockSend = vi.mocked(sendEmailPreview);
const mockAudit = vi.mocked(writeAudit);

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "super-secret-token");
  vi.stubEnv(
    "ALLOWED_PREVIEW_RECIPIENTS",
    "hello@withjosephine.com,maxgertzen+preview@gmail.com",
  );
  mockSend.mockReset();
  mockAudit.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(
  body: unknown,
  headers: Record<string, string> = { "x-admin-token": "super-secret-token" },
): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/admin/send-email-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/send-email-preview", () => {
  it("delivers a preview to an allowlisted recipient", async () => {
    mockSend.mockResolvedValueOnce({ kind: "sent", resendId: "msg_x" });
    const response = await callRoute({
      template: "emailMagicLink",
      recipient: "hello@withjosephine.com",
    });
    expect(response.status).toBe(200);
    const data = (await response.json()) as { outcome: string };
    expect(data.outcome).toBe("sent");
    expect(mockSend).toHaveBeenCalledWith({
      template: "emailMagicLink",
      recipient: "hello@withjosephine.com",
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_email_preview_sent",
        success: true,
      }),
    );
  });

  it("returns 404 when admin token is missing", async () => {
    const response = await callRoute(
      { template: "emailMagicLink", recipient: "hello@withjosephine.com" },
      {},
    );
    expect(response.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 404 when admin token is wrong", async () => {
    const response = await callRoute(
      { template: "emailMagicLink", recipient: "hello@withjosephine.com" },
      { "x-admin-token": "wrong-token" },
    );
    expect(response.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 503 when ALLOWED_PREVIEW_RECIPIENTS is unset", async () => {
    vi.stubEnv("ALLOWED_PREVIEW_RECIPIENTS", "");
    const response = await callRoute({
      template: "emailMagicLink",
      recipient: "hello@withjosephine.com",
    });
    expect(response.status).toBe(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 403 when recipient is not on the allowlist", async () => {
    const response = await callRoute({
      template: "emailMagicLink",
      recipient: "attacker@evil.com",
    });
    expect(response.status).toBe(403);
    const data = (await response.json()) as { reason: string };
    expect(data.reason).toBe("recipient-not-allowlisted");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns 404 when template is not a known preview template", async () => {
    const response = await callRoute({
      template: "emailNotARealOne",
      recipient: "hello@withjosephine.com",
    });
    expect(response.status).toBe(404);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("writes admin_email_preview_sent audit row with success=false on failure", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500" });
    const response = await callRoute({
      template: "emailMagicLink",
      recipient: "hello@withjosephine.com",
    });
    expect(response.status).toBe(500);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "admin_email_preview_sent",
        success: false,
      }),
    );
  });
});
