import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { verifyListenToken } from "@/lib/auth/listenToken";

import type { SubmissionRecord } from "./submissions";

vi.mock("./submissions", async () => {
  const actual = await vi.importActual<typeof import("./submissions")>("./submissions");
  return {
    ...actual,
    findSubmissionById: vi.fn(),
    appendEmailFired: vi.fn(),
  };
});

vi.mock("../resend", () => ({
  sendOrderConfirmation: vi.fn(),
  sendDay7Delivery: vi.fn(),
  redactEmail: vi.fn((s: string) => s.replace(/^./, "*")),
}));

function buildPaidSubmission(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_test_1",
    status: "paid",
    email: "ada@example.com",
    responses: [],
    createdAt: "2026-05-10T00:00:00.000Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: null,
    isGift: false,
    purchaserUserId: null,
    giftDeliveryMethod: null,
    giftClaimTokenHash: null,
    giftClaimSentAt: null,
    giftClaimedAt: null,
    giftCancelledAt: null,
    giftClaimSentNowAt: null,
    giftClaimSentNowActor: null,
    giftClaimPriorAlarmAt: null,    giftSendAt: null,
    giftMessage: null,
    voiceNoteUrl: "https://withjosephine.com/listen/abc",
    pdfUrl: null,
    emailsFired: [],
    ...overrides,
  } as SubmissionRecord;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LISTEN_TOKEN_SECRET", "test-listen-token-secret");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("resendCustomerEmail", () => {
  it("returns not_found when submission missing", async () => {
    const { findSubmissionById } = await import("./submissions");
    vi.mocked(findSubmissionById).mockResolvedValue(null);
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("missing", "order_confirmation");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("returns not_paid for unpaid submissions", async () => {
    const { findSubmissionById } = await import("./submissions");
    vi.mocked(findSubmissionById).mockResolvedValue(
      buildPaidSubmission({ status: "pending" }),
    );
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_pending", "order_confirmation");
    expect(result).toEqual({ ok: false, reason: "not_paid" });
  });

  it("rate_limited after 3 resends of same type in last 24h", async () => {
    const { findSubmissionById } = await import("./submissions");
    const now = new Date("2026-05-18T00:00:00.000Z").getTime();
    vi.setSystemTime(new Date(now));
    vi.mocked(findSubmissionById).mockResolvedValue(
      buildPaidSubmission({
        emailsFired: [
          { type: "order_confirmation", sentAt: new Date(now - 1000).toISOString(), resendId: "a" },
          { type: "order_confirmation", sentAt: new Date(now - 2000).toISOString(), resendId: "b" },
          { type: "order_confirmation", sentAt: new Date(now - 3000).toISOString(), resendId: "c" },
        ],
      }),
    );
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "order_confirmation");
    expect(result).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("ignores resends older than 24h for rate-limit counting", async () => {
    const { findSubmissionById, appendEmailFired } = await import("./submissions");
    const { sendOrderConfirmation } = await import("../resend");
    const now = new Date("2026-05-18T00:00:00.000Z").getTime();
    vi.setSystemTime(new Date(now));
    const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
    vi.mocked(findSubmissionById).mockResolvedValue(
      buildPaidSubmission({
        emailsFired: [
          { type: "order_confirmation", sentAt: twoDaysAgo, resendId: "old1" },
          { type: "order_confirmation", sentAt: twoDaysAgo, resendId: "old2" },
          { type: "order_confirmation", sentAt: twoDaysAgo, resendId: "old3" },
        ],
      }),
    );
    vi.mocked(sendOrderConfirmation).mockResolvedValue({ kind: "sent", resendId: "fresh" });
    vi.mocked(appendEmailFired).mockResolvedValue(undefined);
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "order_confirmation");
    expect(result.ok).toBe(true);
  });

  it("dispatches order_confirmation send and audits emailsFired", async () => {
    const { findSubmissionById, appendEmailFired } = await import("./submissions");
    const { sendOrderConfirmation } = await import("../resend");
    vi.mocked(findSubmissionById).mockResolvedValue(buildPaidSubmission());
    vi.mocked(sendOrderConfirmation).mockResolvedValue({ kind: "sent", resendId: "msg_re_1" });
    vi.mocked(appendEmailFired).mockResolvedValue(undefined);
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "order_confirmation");
    expect(result.ok).toBe(true);
    expect(appendEmailFired).toHaveBeenCalledWith("sub_test_1", expect.objectContaining({
      type: "order_confirmation",
      resendId: "msg_re_1",
    }));
  });

  it("returns send_failed when send returns failed kind", async () => {
    const { findSubmissionById } = await import("./submissions");
    const { sendOrderConfirmation } = await import("../resend");
    vi.mocked(findSubmissionById).mockResolvedValue(buildPaidSubmission());
    vi.mocked(sendOrderConfirmation).mockResolvedValue({ kind: "failed", error: "Resend 500" });
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "order_confirmation");
    expect(result).toEqual({ ok: false, reason: "send_failed" });
  });

  describe("day7 listen-token wiring (Phase 1 one-tap)", () => {
    const NOW = new Date("2026-05-26T00:00:00.000Z").getTime();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const DEFAULT_TTL_MS = 30 * DAY_MS;
    const READING_RETENTION_MS = 90 * DAY_MS;

    function isoDaysAgo(days: number): string {
      return new Date(NOW - days * DAY_MS).toISOString();
    }

    it("dispatches day7 with a /listen/<id>?t=<token> URL, not the raw R2 URL", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById, appendEmailFired } = await import("./submissions");
      const { sendDay7Delivery } = await import("../resend");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: "user_recipient_admin",
          deliveredAt: isoDaysAgo(7),
          voiceNoteUrl: "https://images.withjosephine.com/raw/voice.m4a",
          pdfUrl: "https://images.withjosephine.com/raw/reading.pdf",
        }),
      );
      vi.mocked(sendDay7Delivery).mockResolvedValue({ kind: "sent", resendId: "msg_d7_admin" });
      vi.mocked(appendEmailFired).mockResolvedValue(undefined);
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      const result = await resendCustomerEmail("sub_test_1", "day7");
      expect(result.ok).toBe(true);
      const sendArgs = vi.mocked(sendDay7Delivery).mock.calls[0];
      const listenUrl = sendArgs?.[1] as string;
      expect(listenUrl).toMatch(/\/listen\/sub_test_1\?t=[A-Za-z0-9_.-]+$/);
      expect(listenUrl).not.toContain("images.withjosephine.com");
    });

    it("uses mintSource=admin_resend in the minted token", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById, appendEmailFired } = await import("./submissions");
      const { sendDay7Delivery } = await import("../resend");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: "user_recipient_admin",
          deliveredAt: isoDaysAgo(7),
        }),
      );
      vi.mocked(sendDay7Delivery).mockResolvedValue({ kind: "sent", resendId: "msg_d7" });
      vi.mocked(appendEmailFired).mockResolvedValue(undefined);
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      await resendCustomerEmail("sub_test_1", "day7");
      const listenUrl = vi.mocked(sendDay7Delivery).mock.calls[0]?.[1] as string;
      const token = new URL(listenUrl).searchParams.get("t") ?? "";
      const verified = await verifyListenToken({
        token,
        currentRecipientUserId: "user_recipient_admin",
      });
      expect(verified.valid).toBe(true);
      if (verified.valid) {
        expect(verified.mintSource).toBe("admin_resend");
        expect(verified.submissionId).toBe("sub_test_1");
      }
    });

    it("caps TTL to remaining reading-retention when deliveredAt is 85 days ago", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById, appendEmailFired } = await import("./submissions");
      const { sendDay7Delivery } = await import("../resend");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: "user_recipient_admin",
          deliveredAt: isoDaysAgo(85),
        }),
      );
      vi.mocked(sendDay7Delivery).mockResolvedValue({ kind: "sent", resendId: "msg_d7" });
      vi.mocked(appendEmailFired).mockResolvedValue(undefined);
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      await resendCustomerEmail("sub_test_1", "day7");
      const listenUrl = vi.mocked(sendDay7Delivery).mock.calls[0]?.[1] as string;
      const token = new URL(listenUrl).searchParams.get("t") ?? "";
      const verified = await verifyListenToken({
        token,
        currentRecipientUserId: "user_recipient_admin",
      });
      expect(verified.valid).toBe(true);
      if (verified.valid) {
        // Reading expires 90d after delivery. delivered 85d ago → 5d remaining.
        const expectedExp = NOW - 85 * DAY_MS + READING_RETENTION_MS;
        expect(verified.expMs).toBe(expectedExp);
        // Sanity: TTL is roughly 5 days, well under the 30d default.
        expect(verified.expMs - NOW).toBeLessThan(DEFAULT_TTL_MS);
        expect(verified.expMs - NOW).toBeGreaterThan(4 * DAY_MS);
      }
    });

    it("uses the full 30d default TTL when delivery is recent (7d ago)", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById, appendEmailFired } = await import("./submissions");
      const { sendDay7Delivery } = await import("../resend");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: "user_recipient_admin",
          deliveredAt: isoDaysAgo(7),
        }),
      );
      vi.mocked(sendDay7Delivery).mockResolvedValue({ kind: "sent", resendId: "msg_d7" });
      vi.mocked(appendEmailFired).mockResolvedValue(undefined);
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      await resendCustomerEmail("sub_test_1", "day7");
      const listenUrl = vi.mocked(sendDay7Delivery).mock.calls[0]?.[1] as string;
      const token = new URL(listenUrl).searchParams.get("t") ?? "";
      const verified = await verifyListenToken({
        token,
        currentRecipientUserId: "user_recipient_admin",
      });
      expect(verified.valid).toBe(true);
      if (verified.valid) {
        // Full 30d TTL applies because 30d < remaining retention (83d).
        expect(verified.expMs).toBe(NOW + DEFAULT_TTL_MS);
      }
    });

    it("returns send_failed when reading is already past 90d retention", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById } = await import("./submissions");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: "user_recipient_admin",
          deliveredAt: isoDaysAgo(91),
        }),
      );
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      const result = await resendCustomerEmail("sub_test_1", "day7");
      expect(result).toEqual({ ok: false, reason: "send_failed" });
    });

    it("returns send_failed when recipientUserId is missing", async () => {
      vi.setSystemTime(new Date(NOW));
      const { findSubmissionById } = await import("./submissions");
      vi.mocked(findSubmissionById).mockResolvedValue(
        buildPaidSubmission({
          recipientUserId: null,
          deliveredAt: isoDaysAgo(7),
        }),
      );
      const { resendCustomerEmail } = await import("./resendCustomerEmail");
      const result = await resendCustomerEmail("sub_test_1", "day7");
      expect(result).toEqual({ ok: false, reason: "send_failed" });
    });
  });
});
