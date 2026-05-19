import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  sendDay2Started: vi.fn(),
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
});

afterEach(() => {
  vi.restoreAllMocks();
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

  it("returns missing_listen_url when day7 requested without voiceNoteUrl/pdfUrl", async () => {
    const { findSubmissionById } = await import("./submissions");
    vi.mocked(findSubmissionById).mockResolvedValue(
      buildPaidSubmission({ voiceNoteUrl: undefined, pdfUrl: undefined }),
    );
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "day7");
    expect(result).toEqual({ ok: false, reason: "missing_listen_url" });
  });

  it("returns send_failed when send returns failed kind", async () => {
    const { findSubmissionById } = await import("./submissions");
    const { sendDay2Started } = await import("../resend");
    vi.mocked(findSubmissionById).mockResolvedValue(buildPaidSubmission());
    vi.mocked(sendDay2Started).mockResolvedValue({ kind: "failed", error: "Resend 500" });
    const { resendCustomerEmail } = await import("./resendCustomerEmail");
    const result = await resendCustomerEmail("sub_1", "day2");
    expect(result).toEqual({ ok: false, reason: "send_failed" });
  });
});
