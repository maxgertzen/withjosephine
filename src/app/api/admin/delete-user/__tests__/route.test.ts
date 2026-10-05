import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/submissions")>()),
  findSubmissionRecipientUserId: vi.fn(),
}));
vi.mock("@/lib/compliance/cascadeDeleteUser", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/compliance/cascadeDeleteUser")>()),
  cascadeDeleteUser: vi.fn(),
}));
vi.mock("@/lib/compliance/vendors/stripeRedaction", () => ({
  createStripeRedactionJob: vi.fn().mockResolvedValue({ ok: true, trackingId: "redact_gift" }),
}));
vi.mock("@/lib/compliance/vendors/brevoDelete", () => ({
  deleteBrevoContact: vi.fn().mockResolvedValue({ ok: true, trackingId: null }),
  deleteBrevoSmtpLog: vi.fn().mockResolvedValue({ ok: true, trackingId: null }),
}));
vi.mock("@/lib/compliance/vendors/mixpanelDelete", () => ({
  createMixpanelDataDeletion: vi.fn().mockResolvedValue({ ok: true, trackingId: null }),
}));
vi.mock("@/lib/stripe", () => ({
  retrieveCheckoutSession: vi.fn().mockResolvedValue({ id: "cs_gift_1", customer: "cus_gift" }),
}));
vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn().mockRejectedValue(new Error("sanity not configured")),
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
import { findUserByEmail, getOrCreateUser } from "@/lib/auth/users";
import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";
import { findSubmissionRecipientUserId } from "@/lib/booking/submissions";
import { cascadeDeleteUser } from "@/lib/compliance/cascadeDeleteUser";
import { createStripeRedactionJob } from "@/lib/compliance/vendors/stripeRedaction";
import { createTestGift } from "@/test/fixtures/gift";

const mockFindCtx = vi.mocked(findSubmissionRecipientUserId);
const mockCascade = vi.mocked(cascadeDeleteUser);
const mockAudit = vi.mocked(writeAudit);
const mockStripeRedact = vi.mocked(createStripeRedactionJob);

beforeEach(() => {
  vi.stubEnv("ADMIN_API_KEY", "super-secret-admin-token");
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
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
    const res = await callRoute({ submissionId: "sub_1" }, { "x-admin-token": "wrong-token" });
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

async function giftBoughtBy(buyerEmail: string): Promise<string> {
  const giftId = await createTestGift();
  await dbExec(
    `UPDATE gift_codes SET status = 'active', buyer_email = ?, stripe_session_id = 'cs_gift_1' WHERE id = ?`,
    [buyerEmail, giftId],
  );
  return giftId;
}

async function giftBuyerEmail(giftId: string): Promise<string | null | undefined> {
  const rows = await dbQuery<{ buyer_email: string | null }>(
    `SELECT buyer_email FROM gift_codes WHERE id = ?`,
    [giftId],
  );
  return rows[0]?.buyer_email;
}

describe("POST /api/admin/delete-user with { email }", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("@/lib/compliance/cascadeDeleteUser")>(
      "@/lib/compliance/cascadeDeleteUser",
    );
    mockCascade.mockImplementation(actual.cascadeDeleteUser);
  });

  it("runs the cascade for a gift buyer with no user row and leaves no user row", async () => {
    const giftId = await giftBoughtBy("buyer@example.com");

    const res = await callRoute({ email: "buyer@example.com" });

    expect(res.status).toBe(200);
    expect(mockCascade).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body).toMatchObject({ submissionIds: [], stripeRedactionJobId: "redact_gift" });
    expect(mockStripeRedact).toHaveBeenCalledWith({
      customerIds: ["cus_gift"],
      checkoutSessionIds: ["cs_gift_1"],
    });
    expect(await giftBuyerEmail(giftId)).toBeNull();
    expect(await findUserByEmail("buyer@example.com")).toBeNull();
  });

  it("matches a mixed-case email with surrounding spaces", async () => {
    const giftId = await giftBoughtBy("buyer@example.com");

    const res = await callRoute({ email: "  Buyer@Example.COM " });

    expect(res.status).toBe(200);
    expect(await giftBuyerEmail(giftId)).toBeNull();
  });

  it("cascades the existing user found by email", async () => {
    const { userId } = await getOrCreateUser({ email: "ada@example.com" });

    const res = await callRoute({ email: "Ada@Example.com" });

    expect(res.status).toBe(200);
    expect(mockCascade).toHaveBeenCalledWith(userId, {
      performedBy: "studio-admin",
      ipHash: "ip_hash_test",
    });
    expect(await findUserByEmail("ada@example.com")).toBeNull();
  });

  it("returns 404 (empty body) for an email with no user and no gift, and creates no user", async () => {
    await giftBoughtBy("buyer@example.com");

    const res = await callRoute({ email: "stranger@example.com" });

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
    expect(mockCascade).not.toHaveBeenCalled();
    expect(await findUserByEmail("stranger@example.com")).toBeNull();
  });

  it("uses submissionId and ignores email when both are sent", async () => {
    mockFindCtx.mockResolvedValueOnce({ submissionId: "sub_1", recipientUserId: null });
    await giftBoughtBy("buyer@example.com");

    const res = await callRoute({ submissionId: "sub_1", email: "buyer@example.com" });

    expect(res.status).toBe(404);
    expect(mockCascade).not.toHaveBeenCalled();
  });
});
