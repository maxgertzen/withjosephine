import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/giftClaim", () => ({
  issueGiftClaimToken: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: vi.fn(),
    markGiftClaimSent: vi.fn(),
    appendEmailFired: vi.fn(),
    acquireGiftResendLock: vi.fn().mockResolvedValue(true),
    releaseGiftResendLock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("@/lib/resend", () => ({
  sendGiftClaimEmail: vi.fn(),
  redactEmail: (address: string) => address.replace(/(^.)([^@]+)(?=@)/, "$1***"),
}));

import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import {
  acquireGiftResendLock,
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendGiftClaimEmail } from "@/lib/resend";

const mockFind = vi.mocked(findSubmissionById);
const mockMark = vi.mocked(markGiftClaimSent);
const mockAppend = vi.mocked(appendEmailFired);
const mockIssue = vi.mocked(issueGiftClaimToken);
const mockSend = vi.mocked(sendGiftClaimEmail);

const SCHEDULED_GIFT: SubmissionRecord = {
  _id: "sub_gift",
  status: "paid",
  email: "purchaser@example.com",
  responses: [
    { fieldKey: "recipient_name", fieldLabelSnapshot: "", fieldType: "text", value: "Mira" },
    { fieldKey: "purchaser_first_name", fieldLabelSnapshot: "", fieldType: "text", value: "Lior" },
  ],
  createdAt: "2026-05-01T00:00:00.000Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 17900,
  amountPaidCurrency: "usd",
  recipientUserId: null,
  isGift: true,
  purchaserUserId: "user_purchaser",
  recipientEmail: "recipient@example.com",
  giftDeliveryMethod: "scheduled",
  giftSendAt: "2026-06-01T15:00:00.000Z",
  giftMessage: null,
  giftClaimTokenHash: "old-hash",
  giftClaimEmailFiredAt: "2026-05-02T00:00:00.000Z",
  giftClaimedAt: null,
  giftCancelledAt: null,
};

beforeEach(() => {
  mockFind.mockReset();
  mockMark.mockReset().mockResolvedValue(undefined);
  mockAppend.mockReset().mockResolvedValue(undefined);
  mockIssue.mockReset().mockResolvedValue({
    token: "a".repeat(64),
    tokenHash: "newhash".padEnd(64, "0"),
    claimUrl: "https://withjosephine.com/gift/claim?token=" + "a".repeat(64),
  });
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_regen" });
  vi.stubEnv("DO_DISPATCH_SECRET", "test-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(init: { headers?: Record<string, string>; body?: unknown }): Promise<Response> {
  const { POST } = await import("../route");
  const req = new Request("http://localhost/api/internal/gift-claim-regenerate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return POST(req);
}

describe("/api/internal/gift-claim-regenerate", () => {
  it("returns 401 when secret header missing", async () => {
    const res = await callRoute({ body: { submissionId: "sub_gift" } });
    expect(res.status).toBe(401);
  });

  it("returns 400 when body malformed", async () => {
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: {},
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission not found", async () => {
    mockFind.mockResolvedValueOnce(null);
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_missing" },
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when gift already claimed", async () => {
    mockFind.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimedAt: "2026-05-15T00:00:00.000Z",
    });
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_gift" },
    });
    expect(res.status).toBe(409);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("regenerates token and sends to recipient for scheduled gift", async () => {
    mockFind.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_gift" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { outcome: string; to: string; deliveryMethod: string };
    expect(body.outcome).toBe("regenerated");
    expect(body.deliveryMethod).toBe("scheduled");
    expect(body.to.includes("@example.com")).toBe(true);
    expect(body.to.startsWith("r***")).toBe(true);
    expect(mockMark).toHaveBeenCalledWith("sub_gift", expect.any(String), expect.any(String));
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "first_send",
        recipientEmail: "recipient@example.com",
      }),
    );
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_claim" }),
    );
  });

  it("returns 502 and does NOT persist when Resend returns null resendId (preserves prior token)", async () => {
    mockFind.mockResolvedValueOnce(SCHEDULED_GIFT);
    mockSend.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_gift" },
    });
    expect(res.status).toBe(502);
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("regenerates and sends to purchaser for self_send gift", async () => {
    mockFind.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftDeliveryMethod: "self_send",
    });
    const res = await callRoute({
      headers: { "x-do-secret": "test-secret" },
      body: { submissionId: "sub_gift" },
    });
    expect(res.status).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "first_send",
        recipientEmail: "purchaser@example.com",
      }),
    );
  });

  // Phase 5 Session 4b — B5.17 cooldown.
  describe("5-minute cooldown (B5.17)", () => {
    it("returns 429 when a gift_claim_regenerate fired within the last 5 minutes", async () => {
      const recentIso = new Date(Date.now() - 60 * 1000).toISOString();
      mockFind.mockResolvedValueOnce({
        ...SCHEDULED_GIFT,
        emailsFired: [
          { type: "gift_claim_regenerate", sentAt: recentIso, resendId: "msg_prev" },
        ],
      });
      const res = await callRoute({
        headers: { "x-do-secret": "test-secret" },
        body: { submissionId: "sub_gift" },
      });
      expect(res.status).toBe(429);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("allows regeneration when the last entry is past the cooldown window", async () => {
      const longAgoIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      mockFind.mockResolvedValueOnce({
        ...SCHEDULED_GIFT,
        emailsFired: [
          { type: "gift_claim_regenerate", sentAt: longAgoIso, resendId: "msg_prev" },
        ],
      });
      const res = await callRoute({
        headers: { "x-do-secret": "test-secret" },
        body: { submissionId: "sub_gift" },
      });
      expect(res.status).toBe(200);
      expect(mockSend).toHaveBeenCalled();
    });

    it("appends a gift_claim_regenerate entry alongside gift_claim on success", async () => {
      mockFind.mockResolvedValueOnce(SCHEDULED_GIFT);
      await callRoute({
        headers: { "x-do-secret": "test-secret" },
        body: { submissionId: "sub_gift" },
      });
      const types = mockAppend.mock.calls.map((c) => c[1].type);
      expect(types).toContain("gift_claim");
      expect(types).toContain("gift_claim_regenerate");
    });
  });

  describe("TOCTOU lock", () => {
    it("returns 429 when the atomic lock cannot be acquired (concurrent regenerations)", async () => {
      mockFind.mockResolvedValueOnce(SCHEDULED_GIFT);
      vi.mocked(acquireGiftResendLock).mockResolvedValueOnce(false);
      const res = await callRoute({
        headers: { "x-do-secret": "test-secret" },
        body: { submissionId: "sub_gift" },
      });
      expect(res.status).toBe(429);
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockMark).not.toHaveBeenCalled();
    });
  });
});
