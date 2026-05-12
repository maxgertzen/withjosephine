import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe", () => ({
  constructWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
  markSubmissionExpired: vi.fn(),
  markGiftClaimSent: vi.fn(),
  appendEmailFired: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendGiftPurchaseConfirmation: vi.fn(),
}));

vi.mock("@/lib/booking/giftClaim", () => ({
  issueGiftClaimToken: vi.fn(),
}));

const mockDoFetch = vi.fn();
const mockDoIdFromName = vi.fn();
const mockDoGet = vi.fn();
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn(async () => ({
    env: {
      GIFT_CLAIM_SCHEDULER: {
        idFromName: mockDoIdFromName,
        get: mockDoGet,
      },
    },
  })),
}));

vi.mock("@/lib/booking/notifyPaid", () => ({
  applyPaidEvent: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  serverTrack: vi.fn(),
}));

import { serverTrack } from "@/lib/analytics/server";
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import {
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
  markSubmissionExpired,
} from "@/lib/booking/submissions";
import { sendGiftPurchaseConfirmation } from "@/lib/resend";
import { constructWebhookEvent } from "@/lib/stripe";

const mockConstruct = vi.mocked(constructWebhookEvent);
const mockFind = vi.mocked(findSubmissionById);
const mockApply = vi.mocked(applyPaidEvent);
const mockMarkExpired = vi.mocked(markSubmissionExpired);
const mockServerTrack = vi.mocked(serverTrack);
const mockIssueToken = vi.mocked(issueGiftClaimToken);
const mockMarkGiftClaimSent = vi.mocked(markGiftClaimSent);
const mockAppendEmailFired = vi.mocked(appendEmailFired);
const mockSendGiftConfirmation = vi.mocked(sendGiftPurchaseConfirmation);

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
};

beforeEach(() => {
  mockConstruct.mockReset();
  mockFind.mockReset();
  mockApply.mockReset().mockResolvedValue("applied");
  mockMarkExpired.mockReset().mockResolvedValue(undefined);
  mockServerTrack.mockReset().mockResolvedValue(undefined);
  mockIssueToken.mockReset().mockResolvedValue({
    token: "raw-token",
    tokenHash: "hash-abc",
    claimUrl: "https://withjosephine.com/gift/claim?token=raw-token",
  });
  mockMarkGiftClaimSent.mockReset().mockResolvedValue(undefined);
  mockAppendEmailFired.mockReset().mockResolvedValue(undefined);
  mockSendGiftConfirmation.mockReset().mockResolvedValue({ resendId: "msg_g1" });
  mockDoFetch.mockReset().mockResolvedValue(new Response("{}", { status: 200 }));
  mockDoGet.mockReset().mockReturnValue({ fetch: mockDoFetch });
  mockDoIdFromName.mockReset().mockImplementation((name: string) => ({
    toString: () => `id-${name}`,
  }));
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

  it("returns 200 silently when submission is missing (no retry)", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_1",
      type: "checkout.session.completed",
      created: 1714291200,
      data: { object: { id: "cs_1", client_reference_id: "missing" } },
    } as never);
    mockFind.mockResolvedValueOnce(null);

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockApply).not.toHaveBeenCalled();
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

  it("does not double-apply expired event when stripeEventId already matches", async () => {
    mockConstruct.mockReturnValueOnce({
      id: "evt_2",
      type: "checkout.session.expired",
      created: 1714291200,
      data: { object: { id: "cs_2", client_reference_id: "sub_1" } },
    } as never);
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_2" });

    const res = await callRoute("{}");
    expect(res.status).toBe(200);
    expect(mockMarkExpired).not.toHaveBeenCalled();
  });

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
      mockFind.mockResolvedValueOnce({ ...SUBMISSION, stripeEventId: "evt_d" });

      await callRoute("{}");

      expect(mockServerTrack).not.toHaveBeenCalled();
    });
  });

  describe("gift submissions (Phase 5)", () => {
    const GIFT_SCHEDULED: SubmissionRecord = {
      ...SUBMISSION,
      _id: "sub_gift_sched",
      email: "alice@example.com",
      isGift: true,
      recipientEmail: "bob@example.com",
      giftDeliveryMethod: "scheduled",
      giftSendAt: "2026-06-01T15:00:00.000Z",
      giftMessage: "happy birthday",
      responses: [
        {
          fieldKey: "recipient_name",
          fieldLabelSnapshot: "Recipient name",
          fieldType: "shortText",
          value: "Bob",
        },
      ],
    };

    const GIFT_SELF_SEND: SubmissionRecord = {
      ...SUBMISSION,
      _id: "sub_gift_self",
      email: "alice@example.com",
      isGift: true,
      giftDeliveryMethod: "self_send",
      giftMessage: null,
      responses: [
        {
          fieldKey: "purchaser_first_name",
          fieldLabelSnapshot: "Your first name",
          fieldType: "shortText",
          value: "Alicia",
        },
      ],
    };

    function event(id: string, submissionId: string): unknown {
      return {
        id,
        type: "checkout.session.completed",
        created: 1717000000,
        data: {
          object: {
            id: `cs_${id}`,
            client_reference_id: submissionId,
            amount_total: 17900,
            currency: "usd",
          },
        },
      };
    }

    it("self_send: issues claim token, marks fired, sends self_send email, tracks gift_purchased", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g1", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce(GIFT_SELF_SEND);

      await callRoute("{}");

      expect(mockIssueToken).toHaveBeenCalledOnce();
      expect(mockMarkGiftClaimSent).toHaveBeenCalledWith(
        "sub_gift_self",
        "hash-abc",
        expect.any(String),
      );
      expect(mockSendGiftConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "self_send",
          claimUrl: "https://withjosephine.com/gift/claim?token=raw-token",
          purchaserEmail: "alice@example.com",
          submissionId: "sub_gift_self",
        }),
      );
      expect(mockAppendEmailFired).toHaveBeenCalledWith(
        "sub_gift_self",
        expect.objectContaining({
          type: "gift_purchase_confirmation",
          resendId: "msg_g1",
        }),
      );
      expect(mockServerTrack).toHaveBeenCalledWith(
        "gift_purchased",
        expect.objectContaining({
          submission_id: "sub_gift_self",
          delivery_method: "self_send",
          send_at: null,
        }),
      );
    });

    it("scheduled: schedules the GiftClaimScheduler DO alarm at gift_send_at after sending purchaser confirmation", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g_do", "sub_gift_sched") as never);
      mockFind.mockResolvedValueOnce(GIFT_SCHEDULED);

      await callRoute("{}");

      expect(mockDoIdFromName).toHaveBeenCalledWith("sub_gift_sched");
      expect(mockDoGet).toHaveBeenCalled();
      expect(mockDoFetch).toHaveBeenCalledOnce();
      const req = mockDoFetch.mock.calls[0]![0] as Request;
      expect(req.method).toBe("POST");
      expect(new URL(req.url).pathname).toBe("/schedule");
      const body = JSON.parse(await req.text()) as { fireAtMs: number; submissionId: string };
      expect(body.submissionId).toBe("sub_gift_sched");
      expect(body.fireAtMs).toBe(Date.parse("2026-06-01T15:00:00.000Z"));
    });

    it("self_send: does NOT schedule a DO alarm (no time-deferred send)", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g_do_self", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce(GIFT_SELF_SEND);

      await callRoute("{}");

      expect(mockDoFetch).not.toHaveBeenCalled();
    });

    it("scheduled: does NOT issue claim token, sends scheduled email with send_at date, tracks gift_purchased", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g2", "sub_gift_sched") as never);
      mockFind.mockResolvedValueOnce(GIFT_SCHEDULED);

      await callRoute("{}");

      expect(mockIssueToken).not.toHaveBeenCalled();
      expect(mockMarkGiftClaimSent).not.toHaveBeenCalled();
      expect(mockSendGiftConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "scheduled",
          submissionId: "sub_gift_sched",
          recipientName: "Bob",
        }),
      );
      const sentArgs = mockSendGiftConfirmation.mock.calls[0]![0];
      if (sentArgs.variant !== "scheduled") throw new Error("expected scheduled variant");
      expect(sentArgs.sendAtDisplay).toContain("2026");
      expect(mockServerTrack).toHaveBeenCalledWith(
        "gift_purchased",
        expect.objectContaining({
          submission_id: "sub_gift_sched",
          delivery_method: "scheduled",
          send_at: "2026-06-01T15:00:00.000Z",
        }),
      );
    });

    it("non-gift submission: does NOT trigger gift email or gift_purchased event", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g3", "sub_1") as never);
      mockFind.mockResolvedValueOnce(SUBMISSION);

      await callRoute("{}");

      expect(mockIssueToken).not.toHaveBeenCalled();
      expect(mockSendGiftConfirmation).not.toHaveBeenCalled();
      const trackTypes = mockServerTrack.mock.calls.map((c) => c[0]);
      expect(trackTypes).not.toContain("gift_purchased");
      expect(trackTypes).toContain("payment_success");
    });

    it("prefers purchaserFirstName from responses[purchaser_first_name] over email-derivation", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_gfn1", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce(GIFT_SELF_SEND);

      await callRoute("{}");

      expect(mockSendGiftConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaserFirstName: "Alicia",
        }),
      );
    });

    it("falls back to email-local-part derivation when responses lacks purchaser_first_name", async () => {
      const giftNoNameResponse: SubmissionRecord = {
        ...GIFT_SELF_SEND,
        email: "alice.smith@example.com",
        responses: [],
      };
      mockConstruct.mockReturnValueOnce(event("evt_gfn2", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce(giftNoNameResponse);

      await callRoute("{}");

      expect(mockSendGiftConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaserFirstName: "Alice",
        }),
      );
    });

    it("trims whitespace and falls back to derivation when responses entry is blank", async () => {
      const giftBlankNameResponse: SubmissionRecord = {
        ...GIFT_SELF_SEND,
        email: "ben@example.com",
        responses: [
          {
            fieldKey: "purchaser_first_name",
            fieldLabelSnapshot: "Your first name",
            fieldType: "shortText",
            value: "   ",
          },
        ],
      };
      mockConstruct.mockReturnValueOnce(event("evt_gfn3", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce(giftBlankNameResponse);

      await callRoute("{}");

      expect(mockSendGiftConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          purchaserFirstName: "Ben",
        }),
      );
    });

    it("gift submission on idempotent replay (alreadyApplied): no email, no gift_purchased", async () => {
      mockConstruct.mockReturnValueOnce(event("evt_g4", "sub_gift_self") as never);
      mockFind.mockResolvedValueOnce({ ...GIFT_SELF_SEND, stripeEventId: "evt_g4" });
      mockApply.mockResolvedValueOnce("alreadyApplied");

      await callRoute("{}");

      expect(mockSendGiftConfirmation).not.toHaveBeenCalled();
      expect(mockMarkGiftClaimSent).not.toHaveBeenCalled();
      const trackTypes = mockServerTrack.mock.calls.map((c) => c[0]);
      expect(trackTypes).not.toContain("gift_purchased");
    });
  });
});
