import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/booking/submissions")>("@/lib/booking/submissions");
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

vi.mock("@/lib/booking/duplicatePayment", () => ({
  refundDuplicatePayment: vi.fn(),
}));

vi.mock("@sentry/cloudflare", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@sentry/cloudflare")>()),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/cloudflare";

import { serverTrack } from "@/lib/analytics/server";
import { refundDuplicatePayment } from "@/lib/booking/duplicatePayment";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import {
  findSubmissionById,
  markSubmissionExpired,
} from "@/lib/booking/submissions";
import { constructWebhookEvent } from "@/lib/stripe";

const mockConstruct = vi.mocked(constructWebhookEvent);
const mockFind = vi.mocked(findSubmissionById);
const mockApply = vi.mocked(applyPaidEvent);
const mockMarkExpired = vi.mocked(markSubmissionExpired);
const mockServerTrack = vi.mocked(serverTrack);
const mockRefund = vi.mocked(refundDuplicatePayment);

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
  mockConstruct.mockReset();
  mockFind.mockReset();
  mockApply.mockReset().mockResolvedValue("applied");
  mockMarkExpired.mockReset().mockResolvedValue(true);
  mockServerTrack.mockReset().mockResolvedValue(undefined);
  mockRefund.mockReset().mockResolvedValue(true);
});

async function callRoute(
  body: string,
  headers: Record<string, string> = { "stripe-signature": "sig" },
): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers,
      body,
    }),
  );
}

describe("/api/stripe/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await callRoute("{}", {});
    expect(res.status).toBe(400);
    expect(mockConstruct).not.toHaveBeenCalled();
  });

  it("returns 400 when signature verification throws", async () => {
    mockConstruct.mockImplementationOnce(() => {
      throw new Error("bad sig");
    });
    const res = await callRoute("{}");
    expect(res.status).toBe(400);
  });

  it("uses raw text body for signature verification (not parsed json)", async () => {
    mockConstruct.mockImplementationOnce(() => {
      throw new Error("ignored");
    });
    await callRoute('{"raw":"body"}');
    expect(mockConstruct).toHaveBeenCalledWith('{"raw":"body"}', "sig");
  });

  it("on checkout.session.completed marks paid via applyPaidEvent", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: {
        object: { id: "cs_1", client_reference_id: "sub_1" },
      },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    const res = await callRoute("{}");

    expect(res.status).toBe(200);
    expect(mockApply).toHaveBeenCalledWith(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2024-04-28T08:00:00.000Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
  });

  it("refunds a duplicate paid session and does not track it as a payment", async () => {
    const session = { id: "cs_2", client_reference_id: "sub_1", payment_status: "paid" };
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: session },
    } as never);
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, status: "paid", stripeSessionId: "cs_1" });
    mockApply.mockResolvedValueOnce("duplicate");

    const res = await callRoute("{}");

    expect(res.status).toBe(200);
    expect(mockRefund).toHaveBeenCalledExactlyOnceWith(session);
    expect(mockServerTrack).not.toHaveBeenCalled();
  });

  it("does not mark a booking paid for an unpaid completed session", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "sub_1", payment_status: "unpaid" } },
    } as never);

    const res = await callRoute("{}");

    expect(res.status).toBe(200);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("forwards customer_details.address.country to applyPaidEvent for financial_records", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_3",
      type: "checkout.session.completed",
      created: 1714291200,
      data: {
        object: {
          id: "cs_3",
          client_reference_id: "sub_1",
          amount_total: 9900,
          currency: "usd",
          customer_details: { address: { country: "GB" } },
        },
      },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    await callRoute("{}");

    expect(mockApply).toHaveBeenCalledWith(
      SUBMISSION,
      expect.objectContaining({ country: "GB" }),
    );
  });

  it("forwards amount_total + currency from the session to applyPaidEvent", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.completed",
      created: 1714291200,
      data: {
        object: {
          id: "cs_2",
          client_reference_id: "sub_1",
          amount_total: 9900,
          currency: "usd",
        },
      },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    await callRoute("{}");

    expect(mockApply).toHaveBeenCalledWith(SUBMISSION, {
      stripeEventId: "evt_2",
      stripeSessionId: "cs_2",
      paidAt: "2024-04-28T08:00:00.000Z",
      amountPaidCents: 9900,
      amountPaidCurrency: "usd",
      country: null,
    });
  });

  it("returns 200 silently when checkout.session.completed has no client_reference_id", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: null } },
    } as never);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("returns 500 when the submission is missing so Stripe retries", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "missing" } },
    } as never);
    mockFind.mockResolvedValueOnce(null);

    const res = await callRoute("{}");
    expect(res.status).toBe(500);
    expect(mockApply).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      "Paid Checkout session has no matching submission or gift",
      { level: "warning", extra: { recordId: "missing", stripeSessionId: "cs_1" } },
    );
  });

  it("returns 200 for an expired event whose submission is missing", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "missing" } },
    } as never);
    mockFind.mockResolvedValueOnce(null);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockMarkExpired).not.toHaveBeenCalled();
  });

  it("on idempotent replay applyPaidEvent reports alreadyApplied and route returns 200", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_1" });
    mockApply.mockResolvedValueOnce("alreadyApplied");

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
  });

  it("on checkout.session.expired marks submission expired", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockMarkExpired).toHaveBeenCalledWith("sub_1", {
      stripeEventId: "evt_2",
      expiredAt: "2024-04-28T08:00:00.000Z",
    });
  });

  it("does not fire payment_expired when the submission left pending before the expire write", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);
    mockMarkExpired.mockResolvedValueOnce(false);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockServerTrack).not.toHaveBeenCalled();
  });

  it("ignores unrelated event types (returns 200, no work)", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_3",
      type: "invoice.paid",
      created: 1714291200,
      data: { object: {} },
    } as never);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockFind).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
    expect(mockMarkExpired).not.toHaveBeenCalled();
  });

  it.each(["expired", "paid"] as const)(
    "skips an expired event when the submission is already %s",
    async (status) => {
      mockConstruct.mockReturnValueOnce({
        id: "evt_2",
        type: "checkout.session.expired",
        created: 1714291200,
        data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
      } as never);
      mockFind.mockResolvedValueOnce({ ...SUBMISSION, status, stripeEventId: "evt_1" });

      const res = await callRoute("{}");
      expect(res.status).toBe(200);
      expect(mockMarkExpired).not.toHaveBeenCalled();
      expect(mockServerTrack).not.toHaveBeenCalled();
    },
  );

  describe("analytics", () => {
    it("fires payment_success once on first delivery of completed", async () => {
      mockConstruct.mockReturnValueOnce({
        id: "evt_a",
        type: "checkout.session.completed",
        created: 1714291200,
        data: {
          object: { id: "cs_a", client_reference_id: "sub_1", amount_total: 12900, currency: "usd" },
        },
      } as never);
      mockFind.mockResolvedValueOnce(SUBMISSION);
      mockApply.mockResolvedValueOnce("applied");

      await callRoute("{}");

      expect(mockServerTrack).toHaveBeenCalledOnce();
      expect(mockServerTrack).toHaveBeenCalledWith("payment_success", {
        distinct_id: "sub_1",
        submission_id: "sub_1",
        reading_id: "soul-blueprint",
        amount_paid_cents: 12900,
        currency: "usd",
        stripe_session_id: "cs_a",
      });
    });

    it("does NOT fire payment_success on idempotent retry", async () => {
      mockConstruct.mockReturnValueOnce({
        id: "evt_b",
        type: "checkout.session.completed",
        created: 1714291200,
        data: { object: { id: "cs_b", client_reference_id: "sub_1" } },
      } as never);
      mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_b" });
      mockApply.mockResolvedValueOnce("alreadyApplied");

      await callRoute("{}");

      expect(mockServerTrack).not.toHaveBeenCalled();
    });

    it("fires payment_expired when expired event newly applies", async () => {
      mockConstruct.mockReturnValueOnce({
        id: "evt_c",
        type: "checkout.session.expired",
        created: 1714291200,
        data: { object: { id: "cs_c", client_reference_id: "sub_1" } },
      } as never);
      mockFind.mockResolvedValueOnce(SUBMISSION);

      await callRoute("{}");

      expect(mockServerTrack).toHaveBeenCalledWith("payment_expired", {
        distinct_id: "sub_1",
        submission_id: "sub_1",
        reading_id: "soul-blueprint",
        stripe_session_id: "cs_c",
      });
    });

    it("does NOT fire payment_expired when already-applied dedupe trips", async () => {
      mockConstruct.mockReturnValueOnce({
        id: "evt_d",
        type: "checkout.session.expired",
        created: 1714291200,
        data: { object: { id: "cs_d", client_reference_id: "sub_1" } },
      } as never);
      mockFind.mockResolvedValueOnce({ ...SUBMISSION, status: "expired", stripeEventId: "evt_d" });

      await callRoute("{}");

      expect(mockServerTrack).not.toHaveBeenCalled();
    });
  });
});
