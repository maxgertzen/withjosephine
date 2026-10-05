import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/stripe", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stripe")>()),
  listRecentCompletedCheckoutSessions: vi.fn(),
  refundDuplicateCheckoutSession: vi.fn(),
  retrieveKeptPayment: vi.fn(),
}));

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

import * as Sentry from "@sentry/cloudflare";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import { findGiftById } from "@/lib/gift/gifts";
import { sendGiftPurchase } from "@/lib/resend";
import { fetchEmailGiftSettings, fetchReadingPublished } from "@/lib/sanity/fetch";
import {
  listRecentCompletedCheckoutSessions,
  refundDuplicateCheckoutSession,
  retrieveKeptPayment,
} from "@/lib/stripe";
import { keptPayment, refundAttempt } from "@/test/fixtures/duplicatePayment";
import { createTestGift, giftCheckoutSession, secondGiftCheckoutSession } from "@/test/fixtures/gift";
import { deliverCheckoutEvent } from "@/test/stripeWebhook";

const mockSend = vi.mocked(sendGiftPurchase);
const mockList = vi.mocked(listRecentCompletedCheckoutSessions);
const mockRefund = vi.mocked(refundDuplicateCheckoutSession);
const mockRetrieveKept = vi.mocked(retrieveKeptPayment);

async function runReconcile(sessions: Stripe.Checkout.Session[]) {
  mockList.mockResolvedValueOnce(sessions);
  const { POST } = await import("../route");
  const res = await POST(new Request("http://localhost/api/cron/reconcile", { method: "POST" }));
  return (await res.json()) as { checked: number; reconciled: number; refunded: number };
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  vi.mocked(isCronRequestAuthorized).mockReset().mockReturnValue(true);
  vi.mocked(findSubmissionById).mockReset();
  mockList.mockReset();
  mockRetrieveKept.mockReset();
  mockRefund.mockReset().mockResolvedValue(refundAttempt());
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_1" });
  vi.mocked(fetchEmailGiftSettings).mockReset().mockResolvedValue(null);
  vi.mocked(fetchReadingPublished).mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/api/cron/reconcile with gifts", () => {
  it("sends no second email for a gift the webhook already activated", async () => {
    const giftId = await createTestGift();
    await deliverCheckoutEvent("checkout.session.completed", giftCheckoutSession(giftId));

    await runReconcile([giftCheckoutSession(giftId)]);

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect((await findGiftById(giftId))?.activatedAt).toBe("2026-10-01T10:06:00.000Z");
  });

  it("activates a gift the webhook missed, without counting it as a reconciled submission", async () => {
    const giftId = await createTestGift();

    const summary = await runReconcile([giftCheckoutSession(giftId)]);

    expect(summary).toEqual({ checked: 1, reconciled: 0, refunded: 0 });
    expect(await findGiftById(giftId)).toMatchObject({
      status: "active",
      activatedAt: "2026-10-01T10:05:00.000Z",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(findSubmissionById).not.toHaveBeenCalled();
  });

  it("leaves an unpaid gift session pending", async () => {
    const giftId = await createTestGift();
    await runReconcile([giftCheckoutSession(giftId, "unpaid")]);
    expect((await findGiftById(giftId))?.status).toBe("pending");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("keeps reconciling later sessions when a gift activation throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("resend down"));
    const giftId = await createTestGift();
    vi.mocked(findSubmissionById).mockResolvedValueOnce({ _id: "sub_1" } as SubmissionRecord);
    vi.mocked(applyPaidEvent).mockResolvedValueOnce("applied");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const summary = await runReconcile([
      giftCheckoutSession(giftId),
      { ...giftCheckoutSession(giftId), id: "cs_test_booking", client_reference_id: "sub_1" },
    ]);

    expect(summary).toEqual({ checked: 2, reconciled: 1, refunded: 0 });
    expect((await findGiftById(giftId))?.buyerEmailClaimedAt).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "resend down" }),
      { extra: { giftId } },
    );
    expect(consoleError).toHaveBeenCalledWith(
      `[cron-reconcile] gift ${giftId} activation failed (Error), next run retries`,
    );
  });

  it("refunds a second paid session for a gift once and skips Stripe on the next run", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const giftId = await createTestGift();
    await deliverCheckoutEvent("checkout.session.completed", giftCheckoutSession(giftId));
    const second = secondGiftCheckoutSession(giftId);
    mockRetrieveKept.mockResolvedValue(keptPayment(`gift_${giftId}`));

    const first = await runReconcile([giftCheckoutSession(giftId), second]);
    const rerun = await runReconcile([giftCheckoutSession(giftId), second]);

    expect(first).toEqual({ checked: 2, reconciled: 0, refunded: 1 });
    expect(rerun).toEqual({ checked: 2, reconciled: 0, refunded: 0 });
    expect(mockRefund).toHaveBeenCalledExactlyOnceWith(second, {
      client_reference_id: `gift_${giftId}`,
    });
    expect((await findGiftById(giftId))?.stripeSessionId).toBe(giftCheckoutSession(giftId).id);
  });
});
