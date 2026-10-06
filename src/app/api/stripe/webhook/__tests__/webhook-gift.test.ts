import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    SUBMISSION_STATUS: actual.SUBMISSION_STATUS,
    findSubmissionById: vi.fn(),
    markSubmissionExpired: vi.fn(),
  };
});

vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  refundDuplicateCheckoutSession: vi.fn(),
  retrieveKeptPayment: vi.fn(),
}));

vi.mock("@/lib/booking/notifyPaid", () => ({
  applyPaidEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  serverTrack: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendGiftPurchase: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchEmailGiftSettings: vi.fn(),
  fetchReadingPublished: vi.fn(),
}));

import { serverTrack } from "@/lib/analytics/server";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import { findSubmissionById, markSubmissionExpired } from "@/lib/booking/submissions";
import { findGiftById } from "@/lib/gift/gifts";
import { resolveGiftThankYou } from "@/lib/gift/giftThankYou";
import { sendGiftPurchase } from "@/lib/resend";
import { fetchEmailGiftSettings, fetchReadingPublished } from "@/lib/sanity/fetch";
import { refundDuplicateCheckoutSession, retrieveKeptPayment } from "@/lib/stripe";
import { keptPayment, refundAttempt } from "@/test/fixtures/duplicatePayment";
import {
  auditRows,
  createTestGift,
  forceGiftStatus,
  GIFT_SESSION_ID,
  giftCheckoutSession,
  secondGiftCheckoutSession,
} from "@/test/fixtures/gift";
import { deliverCheckoutEvent } from "@/test/stripeWebhook";

const mockSend = vi.mocked(sendGiftPurchase);
const mockTrack = vi.mocked(serverTrack);
const mockRefund = vi.mocked(refundDuplicateCheckoutSession);
const mockRetrieveKept = vi.mocked(retrieveKeptPayment);

function completed(giftId: string, paymentStatus?: Stripe.Checkout.Session["payment_status"]) {
  return deliverCheckoutEvent(
    "checkout.session.completed",
    giftCheckoutSession(giftId, paymentStatus),
  );
}

function expired(giftId: string) {
  return deliverCheckoutEvent("checkout.session.expired", giftCheckoutSession(giftId));
}

function loadThankYou(giftId: string) {
  return resolveGiftThankYou(GIFT_SESSION_ID, {
    kind: "ok",
    paidAmount: { cents: 8900, display: "$89.00" },
    session: giftCheckoutSession(giftId),
  });
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_1" });
  mockTrack.mockReset().mockResolvedValue(undefined);
  vi.mocked(findSubmissionById).mockReset();
  vi.mocked(markSubmissionExpired).mockReset();
  vi.mocked(applyPaidEvent).mockReset();
  mockRetrieveKept.mockReset();
  vi.mocked(fetchEmailGiftSettings).mockReset().mockResolvedValue(null);
  vi.mocked(fetchReadingPublished).mockReset().mockResolvedValue(null);
  mockRefund.mockReset().mockResolvedValue(refundAttempt());
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Stripe webhook, gift completed", () => {
  it("activates a paid gift and never looks up a submission", async () => {
    const giftId = await createTestGift();

    const res = await completed(giftId);

    expect(res.status).toBe(200);
    expect(await findGiftById(giftId)).toMatchObject({
      status: "active",
      activatedAt: "2026-10-01T10:06:00.000Z",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(findSubmissionById).not.toHaveBeenCalled();
    expect(applyPaidEvent).not.toHaveBeenCalled();
  });

  it("sends one email when the webhook is delivered twice", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    await completed(giftId);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("sends one email when the webhook arrives before the thank-you page", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    await loadThankYou(giftId);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("sends one email when the thank-you page loads before the webhook", async () => {
    const giftId = await createTestGift();
    await loadThankYou(giftId);
    await completed(giftId);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("leaves the gift pending and sends nothing for an unpaid session", async () => {
    const giftId = await createTestGift();
    await completed(giftId, "unpaid");
    expect((await findGiftById(giftId))?.status).toBe("pending");
    expect(mockSend).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook, gift paid twice", () => {
  it("never refunds the second session when the kept payment was refunded", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    mockRetrieveKept.mockResolvedValue(
      keptPayment(`gift_${giftId}`, { refunded: true, amount_refunded: 8900 }),
    );

    const res = await deliverCheckoutEvent("checkout.session.completed", secondGiftCheckoutSession(giftId));

    expect(res.status).toBe(200);
    expect(mockRetrieveKept).toHaveBeenCalledExactlyOnceWith(GIFT_SESSION_ID);
    expect(mockRefund).not.toHaveBeenCalled();
    expect((await findGiftById(giftId))?.stripeSessionId).toBe(GIFT_SESSION_ID);
    expect(await auditRows()).toEqual([
      { event_type: "duplicate_payment_refunded", success: 0, submission_id: `gift_${giftId}` },
    ]);
  });

  it("refunds the second session once and keeps the first", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    mockRetrieveKept.mockResolvedValue(keptPayment(`gift_${giftId}`));

    const res = await deliverCheckoutEvent("checkout.session.completed", secondGiftCheckoutSession(giftId));

    expect(res.status).toBe(200);
    expect(mockRetrieveKept).toHaveBeenCalledExactlyOnceWith(GIFT_SESSION_ID);
    expect(mockRefund).toHaveBeenCalledExactlyOnceWith(secondGiftCheckoutSession(giftId), {
      client_reference_id: `gift_${giftId}`,
    });
    expect((await findGiftById(giftId))?.stripeSessionId).toBe(GIFT_SESSION_ID);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(await auditRows()).toEqual([
      { event_type: "duplicate_payment_refunded", success: 1, submission_id: `gift_${giftId}` },
    ]);
  });

  it("never refunds a retried delivery of the same session", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    await completed(giftId);
    expect(mockRefund).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook, gift expired", () => {
  it("expires a pending gift and tracks payment_expired once", async () => {
    const giftId = await createTestGift();

    await expired(giftId);
    await expired(giftId);

    expect(await findGiftById(giftId)).toMatchObject({
      status: "expired",
      expiredAt: "2026-10-01T10:06:00.000Z",
    });
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("payment_expired", {
      distinct_id: `gift_${giftId}`,
      gift_id: giftId,
      submission_id: null,
      reading_id: "birth-chart",
      stripe_session_id: null,
    });
    expect(findSubmissionById).not.toHaveBeenCalled();
    expect(markSubmissionExpired).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("leaves an active gift active", async () => {
    const giftId = await createTestGift();
    await completed(giftId);
    mockTrack.mockClear();

    await expired(giftId);

    expect((await findGiftById(giftId))?.status).toBe("active");
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("does nothing for a cancelled gift", async () => {
    const giftId = await createTestGift();
    await forceGiftStatus(giftId, "cancelled");

    await expired(giftId);

    expect((await findGiftById(giftId))?.status).toBe("cancelled");
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
