import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../resend", () => ({
  sendNotificationToJosephine: vi.fn(),
  sendOrderConfirmation: vi.fn(),
}));

vi.mock("./submissions", () => ({
  markSubmissionPaid: vi.fn(),
  appendEmailFired: vi.fn(),
  SUBMISSION_STATUS: {
    pending: "pending",
    paid: "paid",
    expired: "expired",
  },
  buildSubmissionContext: vi.fn().mockReturnValue({
    id: "sub_1",
    email: "client@example.com",
    firstName: "Ada",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    responses: [],
    photoUrl: null,
    createdAt: "2026-04-28T12:00:00Z",
  }),
}));

vi.mock("../auth/users", () => ({
  getOrCreateUser: vi.fn(),
}));

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import { applyPaidEvent } from "./notifyPaid";
import {
  appendEmailFired,
  markSubmissionPaid,
  type SubmissionRecord,
} from "./submissions";

const mockMarkPaid = vi.mocked(markSubmissionPaid);
const mockJosephine = vi.mocked(sendNotificationToJosephine);
const mockOrderConfirmation = vi.mocked(sendOrderConfirmation);
const mockAppendEmailFired = vi.mocked(appendEmailFired);
const mockGetOrCreateUser = vi.mocked(getOrCreateUser);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: null,
  isGift: false,
  purchaserUserId: null,
  recipientEmail: null,
  giftDeliveryMethod: null,
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,};

beforeEach(() => {
  mockMarkPaid.mockReset().mockResolvedValue(undefined);
  mockJosephine.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_j" });
  mockOrderConfirmation.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_oc" });
  mockAppendEmailFired.mockReset().mockResolvedValue(undefined);
  mockGetOrCreateUser
    .mockReset()
    .mockResolvedValue({ userId: "user_test_1", isNew: true });
});

describe("applyPaidEvent", () => {
  it("returns alreadyApplied without side effects when stripeEventId matches", async () => {
    const result = await applyPaidEvent(
      { ...SUBMISSION, stripeEventId: "evt_1" },
      {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: null,
        amountPaidCurrency: null,
        country: null,
      },
    );

    expect(result).toBe("alreadyApplied");
    expect(mockMarkPaid).not.toHaveBeenCalled();
    expect(mockJosephine).not.toHaveBeenCalled();
    expect(mockOrderConfirmation).not.toHaveBeenCalled();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("marks paid (with recipientUserId folded in), fires both Resend emails, and writes order_confirmation to emailsFired", async () => {
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledWith(
      "sub_1",
      {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: null,
        amountPaidCurrency: null,
        country: null,
        recipientUserId: "user_test_1",
      },
      undefined,
    );
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockOrderConfirmation).toHaveBeenCalledOnce();
    expect(mockAppendEmailFired).toHaveBeenCalledOnce();
    const entry = mockAppendEmailFired.mock.calls[0]?.[1];
    expect(entry?.type).toBe("order_confirmation");
    expect(entry?.resendId).toBe("msg_oc");
  });

  it("does not append emailsFired when order confirmation returns null resendId", async () => {
    mockOrderConfirmation.mockResolvedValueOnce({ kind: "failed", error: "test stub failure" });
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("does not propagate Resend failures", async () => {
    mockJosephine.mockRejectedValueOnce(new Error("Resend down"));
    mockOrderConfirmation.mockRejectedValueOnce(new Error("Resend down"));

    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledOnce();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("swallows emailsFired write failures without throwing", async () => {
    mockAppendEmailFired.mockRejectedValueOnce(new Error("Sanity down"));
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
    expect(result).toBe("applied");
  });

  it("creates a user from submission.email + extracted firstName before the paid UPDATE", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(mockGetOrCreateUser).toHaveBeenCalledWith({
      email: "client@example.com",
      name: "Ada",
    });
    // Order assertion: getOrCreateUser must run BEFORE markSubmissionPaid
    // so recipient_user_id rides the same UPDATE statement (fix #11).
    const userOrder = mockGetOrCreateUser.mock.invocationCallOrder[0]!;
    const paidOrder = mockMarkPaid.mock.invocationCallOrder[0]!;
    expect(userOrder).toBeLessThan(paidOrder);
  });

  it("does NOT clobber recipient_user_id with the purchaser's userId for gift submissions (C2)", async () => {
    const giftSubmission: SubmissionRecord = {
      ...SUBMISSION,
      isGift: true,
      purchaserUserId: "user_purchaser",
      recipientEmail: "recipient@example.com",
      giftDeliveryMethod: "scheduled",
      giftSendAt: "2026-05-21T12:00:00Z",
    };

    await applyPaidEvent(giftSubmission, {
      stripeEventId: "evt_gift",
      stripeSessionId: "cs_gift",
      paidAt: "2026-05-20T12:00:00Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
      country: "US",
    });

    expect(mockMarkPaid).toHaveBeenCalledOnce();
    const [, paidArg] = mockMarkPaid.mock.calls[0]!;
    expect(paidArg.recipientUserId).toBeNull();
  });

  it("does NOT resolve a user from purchaser email at paid time for gift submissions (C2)", async () => {
    const giftSubmission: SubmissionRecord = {
      ...SUBMISSION,
      isGift: true,
      purchaserUserId: "user_purchaser",
      recipientEmail: "recipient@example.com",
    };

    await applyPaidEvent(giftSubmission, {
      stripeEventId: "evt_gift_2",
      stripeSessionId: "cs_gift_2",
      paidAt: "2026-05-20T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(mockGetOrCreateUser).not.toHaveBeenCalled();
  });

  it("still resolves and writes recipient_user_id for non-gift submissions (regression guard for the fix)", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_self",
      stripeSessionId: "cs_self",
      paidAt: "2026-05-20T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(mockGetOrCreateUser).toHaveBeenCalledOnce();
    const [, paidArg] = mockMarkPaid.mock.calls[0]!;
    expect(paidArg.recipientUserId).toBe("user_test_1");
  });

  it("passes a financial_records mirror to markSubmissionPaid when amount + currency present (atomic dbBatch)", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00.000Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
      country: "GB",
    });

    expect(mockMarkPaid).toHaveBeenCalledWith(
      "sub_1",
      expect.any(Object),
      {
        submissionId: "sub_1",
        userId: "user_test_1",
        email: "client@example.com",
        paidAt: "2026-04-28T12:00:00.000Z",
        amountPaidCents: 9900,
        amountPaidCurrency: "usd",
        country: "GB",
        stripeSessionId: "cs_1",
      },
    );
  });

  it("omits the financial mirror when amount or currency is null", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00.000Z",
      amountPaidCents: null,
      amountPaidCurrency: "usd",
      country: null,
    });

    const call = mockMarkPaid.mock.calls[0]!;
    expect(call[2]).toBeUndefined();
  });

  it("skips order_confirmation for gift purchasers (B-3 — gift_purchase_confirmation handles them)", async () => {
    await applyPaidEvent(
      { ...SUBMISSION, isGift: true },
      {
        stripeEventId: "evt_gift",
        stripeSessionId: "cs_gift",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: 9900,
        amountPaidCurrency: "usd",
        country: null,
      },
    );

    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockOrderConfirmation).not.toHaveBeenCalled();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("still sends order_confirmation for non-gift purchases (B-3 regression guard)", async () => {
    await applyPaidEvent(
      { ...SUBMISSION, isGift: false },
      {
        stripeEventId: "evt_purchase",
        stripeSessionId: "cs_purchase",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: 17900,
        amountPaidCurrency: "usd",
        country: null,
      },
    );

    expect(mockOrderConfirmation).toHaveBeenCalledOnce();
  });

  it("still applies the paid state with recipientUserId=null when user-create throws", async () => {
    mockGetOrCreateUser.mockRejectedValueOnce(new Error("D1 down"));
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ recipientUserId: null }),
      undefined,
    );
    // Email fan-out still happens.
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockOrderConfirmation).toHaveBeenCalledOnce();
  });
});
