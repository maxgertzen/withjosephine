import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/cloudflare", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

vi.mock("@/lib/stripe", async (importOriginal) => ({
  duplicateRefundKey: (await importOriginal<typeof import("@/lib/stripe")>()).duplicateRefundKey,
  refundDuplicateCheckoutSession: vi.fn(),
  retrieveKeptPayment: vi.fn(),
}));

vi.mock("@/lib/gift/gifts", () => ({ findGiftById: vi.fn() }));

vi.mock("./submissions", () => ({ findPaidStripeSessionId: vi.fn() }));

vi.mock("@/lib/auth/listenSession", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/listenSession")>();
  return { ...actual, writeAuditOnce: vi.fn(actual.writeAuditOnce) };
});

import * as Sentry from "@sentry/cloudflare";

import { writeAuditOnce } from "@/lib/auth/listenSession";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { findGiftById } from "@/lib/gift/gifts";
import {
  duplicateRefundKey,
  refundDuplicateCheckoutSession,
  retrieveKeptPayment,
} from "@/lib/stripe";
import { captureConsole } from "@/test/captureConsole";
import { keptPayment, refundAttempt } from "@/test/fixtures/duplicatePayment";
import { auditRows, makeGiftRecord } from "@/test/fixtures/gift";

import { refundDuplicatePayment } from "./duplicatePayment";
import { findPaidStripeSessionId } from "./submissions";

const mockRefund = vi.mocked(refundDuplicateCheckoutSession);
const mockRetrieveKept = vi.mocked(retrieveKeptPayment);
const mockFindGift = vi.mocked(findGiftById);
const mockFindPaidSession = vi.mocked(findPaidStripeSessionId);
const mockCaptureMessage = vi.mocked(Sentry.captureMessage);
const mockCaptureException = vi.mocked(Sentry.captureException);

const KEPT_SESSION_ID = "cs_test_kept";

const SESSION = {
  id: "cs_test_duplicate",
  client_reference_id: "gift_abc",
  payment_status: "paid",
  payment_intent: "pi_test_duplicate",
  amount_total: 8900,
} as Stripe.Checkout.Session;

const BOOKING_SESSION = {
  ...SESSION,
  client_reference_id: "sub_1",
} as Stripe.Checkout.Session;

const EXTRA = { clientReferenceId: "gift_abc", stripeSessionId: "cs_test_duplicate" };

let capturedConsole: ReturnType<typeof captureConsole>;

beforeEach(() => {
  mockRefund.mockReset();
  mockRetrieveKept.mockReset().mockResolvedValue(keptPayment("gift_abc"));
  mockFindGift.mockReset().mockResolvedValue(makeGiftRecord({ stripeSessionId: KEPT_SESSION_ID }));
  mockFindPaidSession.mockReset().mockResolvedValue(KEPT_SESSION_ID);
  mockCaptureMessage.mockReset();
  mockCaptureException.mockReset();
  capturedConsole = captureConsole();
});

afterEach(() => {
  expect(capturedConsole.text()).not.toMatch(/cs_|pi_/);
  vi.restoreAllMocks();
});

describe("refundDuplicatePayment", () => {
  it.each([
    ["succeeded", "Duplicate Checkout payment refunded", "refund of the second payment succeeded"],
    [
      "pending",
      "Duplicate Checkout payment refund is pending, confirm it in Stripe the next day",
      "refund of the second payment is pending",
    ],
  ])(
    "records a %s refund once with its Sentry warning and a successful audit row",
    async (status, sentryMessage, logLine) => {
      mockRefund.mockResolvedValue(refundAttempt(status));

      expect(await refundDuplicatePayment(SESSION)).toBe(true);

      expect(mockFindGift).toHaveBeenCalledWith("abc");
      expect(mockRetrieveKept).toHaveBeenCalledWith(KEPT_SESSION_ID);
      expect(mockRefund).toHaveBeenCalledWith(SESSION, { client_reference_id: "gift_abc" });
      expect(mockCaptureMessage).toHaveBeenCalledWith(sentryMessage, {
        level: "warning",
        extra: { ...EXTRA, refundId: "re_test_1", amountCents: 8900 },
      });
      expect(capturedConsole.text()).toContain(`gift_abc paid twice, ${logLine}`);
      expect(await auditRows()).toEqual([
        { event_type: "duplicate_payment_refunded", success: 1, submission_id: "gift_abc" },
      ]);
    },
  );

  it("skips the Stripe call once a successful refund is recorded for the session", async () => {
    mockRefund.mockResolvedValue(refundAttempt("succeeded"));
    await refundDuplicatePayment(SESSION);

    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockRefund).toHaveBeenCalledOnce();
    expect(mockCaptureMessage).toHaveBeenCalledOnce();
  });

  it("records the refund when a later run gets the result of a call that first timed out", async () => {
    mockRefund
      .mockRejectedValueOnce(new Error("Request timed out"))
      .mockResolvedValueOnce(refundAttempt("succeeded"));

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(await refundDuplicatePayment(SESSION)).toBe(true);

    expect(await dbQuery(`SELECT id, success FROM listen_audit ORDER BY success`)).toEqual([
      { id: `${duplicateRefundKey(SESSION.id)}/failed`, success: 0 },
      { id: duplicateRefundKey(SESSION.id), success: 1 },
    ]);
  });

  it("reports a replayed error once with a failed audit row", async () => {
    const error = new Error("Stripe down");
    mockRefund.mockRejectedValue(error);

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(error, { extra: EXTRA });
    expect(await auditRows()).toEqual([
      { event_type: "duplicate_payment_refunded", success: 0, submission_id: "gift_abc" },
    ]);
  });

  it.each(["failed", "canceled", "requires_action"])(
    "takes the failure path for a %s refund",
    async (status) => {
      mockRefund.mockResolvedValue(refundAttempt(status));

      expect(await refundDuplicatePayment(SESSION)).toBe(false);

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({ message: `Duplicate refund re_test_1 is ${status}` }),
        { extra: EXTRA },
      );
      expect(mockCaptureMessage).not.toHaveBeenCalled();
      expect(await auditRows()).toEqual([
        { event_type: "duplicate_payment_refunded", success: 0, submission_id: "gift_abc" },
      ]);
    },
  );

  it.each(["nothing_to_refund", "in_flight"] as const)(
    "returns false quietly with no Sentry event and no audit row for %s",
    async (kind) => {
      mockRefund.mockResolvedValue({ kind });

      expect(await refundDuplicatePayment(SESSION)).toBe(false);

      expect(mockCaptureMessage).not.toHaveBeenCalled();
      expect(mockCaptureException).not.toHaveBeenCalled();
      expect(await auditRows()).toEqual([]);
    },
  );

  it("sends one Sentry warning per session when the session has no payment intent", async () => {
    mockRefund.mockResolvedValue({ kind: "no_payment_intent" });

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockCaptureMessage).toHaveBeenCalledExactlyOnceWith(
      "Duplicate Checkout session has no payment intent, no refund",
      { level: "warning", extra: EXTRA },
    );
  });

  it.each(["unpaid", "no_payment_required"] as const)(
    "never refunds a %s session and stays quiet",
    async (paymentStatus) => {
      const session = { ...SESSION, payment_status: paymentStatus } as Stripe.Checkout.Session;

      expect(await refundDuplicatePayment(session)).toBe(false);

      expect(mockRefund).not.toHaveBeenCalled();
      expect(mockCaptureMessage).not.toHaveBeenCalled();
    },
  );

  it("counts the refund and reports an exception instead of the success message when the audit write fails after it", async () => {
    mockRefund.mockResolvedValue(refundAttempt("succeeded"));
    vi.mocked(writeAuditOnce).mockRejectedValueOnce(new Error("D1 down"));

    expect(await refundDuplicatePayment(SESSION)).toBe(true);

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "D1 down" }),
      { extra: { ...EXTRA, refundId: "re_test_1", amountCents: 8900, refundStatus: "succeeded" } },
    );
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it("reports the refund once on the next run after a failed audit write", async () => {
    mockRefund.mockResolvedValue(refundAttempt("succeeded"));
    vi.mocked(writeAuditOnce).mockRejectedValueOnce(new Error("D1 down"));
    await refundDuplicatePayment(SESSION);

    expect(await refundDuplicatePayment(SESSION)).toBe(true);
    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockCaptureMessage).toHaveBeenCalledOnce();
  });

  it("records a second payment already refunded in Stripe once and stops calling Stripe", async () => {
    mockRefund.mockResolvedValue({ kind: "already_refunded" });

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockRefund).toHaveBeenCalledOnce();
    expect(mockCaptureMessage).toHaveBeenCalledExactlyOnceWith(
      "Duplicate Checkout payment was already refunded in Stripe",
      { level: "warning", extra: EXTRA },
    );
    expect(await auditRows()).toEqual([
      { event_type: "duplicate_payment_refunded", success: 1, submission_id: "gift_abc" },
    ]);
  });
});

describe("refundDuplicatePayment checks the kept payment first", () => {
  it("reads the kept session of a booking from the paid submission", async () => {
    mockRetrieveKept.mockResolvedValue(keptPayment("sub_1"));
    mockRefund.mockResolvedValue(refundAttempt("succeeded"));

    expect(await refundDuplicatePayment(BOOKING_SESSION)).toBe(true);

    expect(mockFindPaidSession).toHaveBeenCalledWith("sub_1");
    expect(mockFindGift).not.toHaveBeenCalled();
    expect(mockRetrieveKept).toHaveBeenCalledWith(KEPT_SESSION_ID);
  });

  it.each([
    ["refunded", keptPayment("gift_abc", { refunded: true, amount_refunded: 8900 })],
    ["refunded", keptPayment("gift_abc", { amount_refunded: 100 })],
    ["disputed", keptPayment("gift_abc", { disputed: true })],
    ["without a succeeded charge", keptPayment("gift_abc", { status: "failed" })],
    ["without a succeeded charge", { ...keptPayment("gift_abc"), charge: null }],
    ["not paid", { ...keptPayment("gift_abc"), paymentStatus: "unpaid" as const }],
    ["for another reference", keptPayment("gift_other")],
  ])("never refunds when the kept payment is %s and reports it once", async (reason, kept) => {
    mockRetrieveKept.mockResolvedValue(kept);

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledExactlyOnceWith(
      `Duplicate Checkout payment not refunded, the kept payment is ${reason}`,
      { level: "error", extra: { ...EXTRA, keptSessionId: KEPT_SESSION_ID } },
    );
    expect(await auditRows()).toEqual([
      { event_type: "duplicate_payment_refunded", success: 0, submission_id: "gift_abc" },
    ]);
  });

  it.each([
    ["the gift is gone", null],
    ["the gift holds no session", makeGiftRecord({ stripeSessionId: null })],
    ["the gift holds this same session", makeGiftRecord({ stripeSessionId: SESSION.id })],
  ])("never refunds and never calls Stripe when %s", async (_case, gift) => {
    mockFindGift.mockResolvedValue(gift);

    expect(await refundDuplicatePayment(SESSION)).toBe(false);

    expect(mockRetrieveKept).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      "Duplicate Checkout payment not refunded, the kept payment is not on record",
      { level: "error", extra: { ...EXTRA, keptSessionId: gift?.stripeSessionId ?? null } },
    );
  });

  it("never refunds a booking whose submission holds no other paid session", async () => {
    mockFindPaidSession.mockResolvedValue(null);

    expect(await refundDuplicatePayment(BOOKING_SESSION)).toBe(false);

    expect(mockRetrieveKept).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("never refunds when Stripe cannot return the kept payment, and refunds on a later run once it can", async () => {
    const error = new Error("Request timed out");
    mockRetrieveKept.mockRejectedValueOnce(error);
    mockRefund.mockResolvedValue(refundAttempt("succeeded"));

    expect(await refundDuplicatePayment(SESSION)).toBe(false);
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockCaptureException).toHaveBeenCalledExactlyOnceWith(error, { extra: EXTRA });

    expect(await refundDuplicatePayment(SESSION)).toBe(true);
    expect(mockRefund).toHaveBeenCalledOnce();
  });
});
