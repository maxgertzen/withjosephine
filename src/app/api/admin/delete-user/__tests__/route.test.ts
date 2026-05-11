import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionRecipientUserId: vi.fn(),
}));
vi.mock("@/lib/compliance/cascadeDeleteUser", () => ({
  cascadeDeleteUser: vi.fn(),
}));
vi.mock("@/lib/auth/listenSession", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/auth/listenSession");
  return { ...actual, writeAudit: vi.fn() };
});
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip_hash_test", userAgentHash: "ua_hash_test" }),
  getClientIpKey: vi.fn().mockReturnValue("ip_test"),
}));

import { writeAudit } from "@/lib/auth/listenSession";
import { findSubmissionRecipientUserId } from "@/lib/booking/submissions";
import { cascadeDeleteUser } from "@/lib/compliance/cascadeDeleteUser";

const mockFindCtx = vi.mocked(findSubmissionRecipientUserId);
const mockCascade = vi.mocked(cascadeDeleteUser);
const mockAudit = vi.mocked(writeAudit);

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "super-secret-admin-token");
  mockFindCtx.mockReset();
  mockCascade.mockReset();
  mockAudit.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(
  body: unknown,
  headers: Record<string, string> = { "x-admin-token": "super-secret-admin-token" },
): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/admin/delete-user", () => {
  it("returns 404 (empty body) when ADMIN_API_KEY env is missing", async () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    const res = await callRoute({ submissionId: "sub_1" });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockCascade).not.toHaveBeenCalled();
  });

  it("returns 404 + writes admin_auth_failed audit when X-Admin-Token header is absent", async () => {
    const res = await callRoute({ submissionId: "sub_1" }, {});
    expect(res.status).toBe(404);
    expect(mockCascade).not.toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: "admin_auth_failed",
        ipHash: "ip_hash_test",
        success: false,
      }),
    );
  });

  it("returns 404 + writes admin_auth_failed audit when token does not match", async () => {
    const res = await callRoute(
      { submissionId: "sub_1" },
      { "x-admin-token": "wrong-token" },
    );
    expect(res.status).toBe(404);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "admin_auth_failed", success: false }),
    );
    expect(mockCascade).not.toHaveBeenCalled();
  });

  it("returns 404 (empty body, no audit) on malformed JSON body — auth was valid", async () => {
    const res = await callRoute("{not json");
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockAudit).not.toHaveBeenCalled();
  });

  it("returns 404 (empty body) when submissionId is missing", async () => {
    const res = await callRoute({});
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("returns 404 (empty body) when submission has no recipient_user_id — indistinguishable from auth failure", async () => {
    mockFindCtx.mockResolvedValueOnce({ submissionId: "sub_1", recipientUserId: null });
    const res = await callRoute({ submissionId: "sub_1" });
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockCascade).not.toHaveBeenCalled();
  });

  it("invokes cascadeDeleteUser with the resolved userId + ipHash on success", async () => {
    mockFindCtx.mockResolvedValueOnce({ submissionId: "sub_1", recipientUserId: "user_a" });
    mockCascade.mockResolvedValueOnce({
      userId: "user_a",
      submissionIds: ["sub_1"],
      startedAt: 1,
      completedAt: 2,
      stripeRedactionJobId: "redact_99",
      brevoSmtpProcessId: "proc_42",
      mixpanelTaskId: "task_7",
      partialFailures: [],
      success: true,
    });

    const res = await callRoute({ submissionId: "sub_1" });
    expect(res.status).toBe(200);
    expect(mockCascade).toHaveBeenCalledWith("user_a", {
      performedBy: "studio-admin",
      ipHash: "ip_hash_test",
    });
    const body = await res.json();
    expect(body).toEqual({
      userId: "user_a",
      submissionIds: ["sub_1"],
      partialFailures: [],
      stripeRedactionJobId: "redact_99",
      brevoSmtpProcessId: "proc_42",
      mixpanelTaskId: "task_7",
    });
  });
});
