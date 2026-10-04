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

vi.mock("./emailFailures", async () => {
  const actual = await vi.importActual<typeof import("./emailFailures")>("./emailFailures");
  return { ...actual, recordEmailFailure: vi.fn() };
});

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import { recordEmailFailure } from "./emailFailures";
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
const mockRecordFailure = vi.mocked(recordEmailFailure);

const PAID_DETAILS = {
  stripeEventId: "evt_1",
  stripeSessionId: "cs_1",
  paidAt: "2026-04-28T12:00:00Z",
  amountPaidCents: 17900,
  amountPaidCurrency: "usd",
  country: null,
};

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
};

beforeEach(() => {
  mockMarkPaid.mockReset().mockResolvedValue(undefined);
  mockJosephine.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_j" });
  mockOrderConfirmation.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_oc" });
  mockAppendEmailFired.mockReset().mockResolvedValue(undefined);
  mockGetOrCreateUser
    .mockReset()
    .mockResolvedValue({ userId: "user_test_1", isNew: true });
  mockRecordFailure.mockReset().mockResolvedValue(undefined);
});

describe("applyPaidEvent", () => {
  it("returns alreadyApplied without side effects when the submission is already paid", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await applyPaidEvent(
      { ...SUBMISSION, status: "paid", stripeEventId: "evt_1", stripeSessionId: "cs_1" },
      {
        stripeEventId: "reconcile:cs_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: 17900,
        amountPaidCurrency: "usd",
        country: null,
      },
    );

    expect(result).toBe("alreadyApplied");
    expect(warnSpy).not.toHaveBeenCalled();
    expect(mockGetOrCreateUser).not.toHaveBeenCalled();
    expect(mockMarkPaid).not.toHaveBeenCalled();
    expect(mockJosephine).not.toHaveBeenCalled();
    expect(mockOrderConfirmation).not.toHaveBeenCalled();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("warns when a second paid session arrives for an already-paid submission", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await applyPaidEvent(
      { ...SUBMISSION, status: "paid", stripeEventId: "evt_1", stripeSessionId: "cs_1" },
      {
        stripeEventId: "evt_2",
        stripeSessionId: "cs_2",
        paidAt: "2026-04-28T13:00:00Z",
        amountPaidCents: 17900,
        amountPaidCurrency: "usd",
        country: null,
      },
    );

    expect(result).toBe("alreadyApplied");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("cs_2"));
    expect(mockOrderConfirmation).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("sends each email once when reconcile runs after the webhook applied the payment", async () => {
    const webhookResult = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: 17900,
      amountPaidCurrency: "usd",
      country: null,
    });
    const reconcileResult = await applyPaidEvent(
      { ...SUBMISSION, status: "paid", stripeEventId: "evt_1", stripeSessionId: "cs_1" },
      {
        stripeEventId: "reconcile:cs_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: 17900,
        amountPaidCurrency: "usd",
        country: null,
      },
    );

    expect(webhookResult).toBe("applied");
    expect(reconcileResult).toBe("alreadyApplied");
    expect(mockMarkPaid).toHaveBeenCalledOnce();
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockOrderConfirmation).toHaveBeenCalledOnce();
    expect(mockAppendEmailFired).toHaveBeenCalledOnce();
  });

  it("passes per-submission Resend idempotency keys for both paid emails", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });

    expect(mockJosephine).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: "josephine-notification/sub_1",
    });
    expect(mockOrderConfirmation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idempotencyKey: "order-confirmation/sub_1" }),
    );
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

  it("resolves and writes recipient_user_id for paid submissions", async () => {
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

  it("sends order_confirmation for paid purchases", async () => {
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_purchase",
      stripeSessionId: "cs_purchase",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: 17900,
      amountPaidCurrency: "usd",
      country: null,
    });

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

  it("records a failed order confirmation with the Resend error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockOrderConfirmation.mockResolvedValueOnce({
      kind: "failed",
      error: "validation_error",
      statusCode: 422,
    });

    await applyPaidEvent(SUBMISSION, PAID_DETAILS);

    expect(mockRecordFailure).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({
        emailType: "order_confirmation",
        kind: "send_error",
        recipient: "client@example.com",
        statusCode: 422,
        errorCode: "validation_error",
      }),
    );
  });

  it("records a thrown order confirmation as a failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockOrderConfirmation.mockRejectedValueOnce(new Error("Resend unreachable"));

    await applyPaidEvent(SUBMISSION, PAID_DETAILS);

    expect(mockRecordFailure).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ kind: "send_error", errorMessage: "Resend unreachable" }),
    );
  });

  it.each([
    { kind: "sent", resendId: "msg_oc" },
    { kind: "dry_run" },
  ] as const)("records no failure when the order confirmation result is $kind", async (result) => {
    mockOrderConfirmation.mockResolvedValueOnce(result);

    await applyPaidEvent(SUBMISSION, PAID_DETAILS);

    expect(mockRecordFailure).not.toHaveBeenCalled();
  });
});
