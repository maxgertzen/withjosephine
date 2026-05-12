import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SubmissionRecord } from "@/lib/booking/submissions";

const cookieGetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock })),
}));

const getActiveSessionMock = vi.fn();
vi.mock("@/lib/auth/listenSession", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/listenSession")>(
    "@/lib/auth/listenSession",
  );
  return { ...actual, getActiveSession: getActiveSessionMock };
});

const findSubmissionMock = vi.fn();
const flipMock = vi.fn();
const appendEmailFiredMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    flipGiftToSelfSend: flipMock,
    appendEmailFired: appendEmailFiredMock,
  };
});

const issueTokenMock = vi.fn();
vi.mock("@/lib/booking/giftClaim", () => ({ issueGiftClaimToken: issueTokenMock }));

const sendMock = vi.fn();
vi.mock("@/lib/resend", () => ({ sendGiftPurchaseConfirmation: sendMock }));

const stubFetchMock = vi.fn();
const namespaceGetMock = vi.fn(() => ({ fetch: stubFetchMock }));
const idFromNameMock = vi.fn(() => ({ toString: () => "do-id" }));

const PURCHASER_ID = "user_purchaser";

const SCHEDULED_GIFT: SubmissionRecord = {
  _id: "sub_gift",
  status: "paid",
  email: "purchaser@example.com",
  responses: [],
  createdAt: "2026-05-01T00:00:00.000Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 17900,
  amountPaidCurrency: "usd",
  recipientUserId: null,
  isGift: true,
  purchaserUserId: PURCHASER_ID,
  recipientEmail: "recipient@example.com",
  giftDeliveryMethod: "scheduled",
  giftSendAt: "2026-06-01T15:00:00.000Z",
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
};

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  findSubmissionMock.mockReset();
  flipMock.mockReset().mockResolvedValue(true);
  appendEmailFiredMock.mockReset().mockResolvedValue(undefined);
  issueTokenMock.mockReset().mockResolvedValue({
    token: "a".repeat(64),
    tokenHash: "h".repeat(64),
    claimUrl: "https://test.local/gift/claim?token=" + "a".repeat(64),
  });
  sendMock.mockReset().mockResolvedValue({ resendId: "msg_flip" });
  stubFetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ cancelled: true })));
  (globalThis as Record<string, unknown>).GIFT_CLAIM_SCHEDULER = {
    idFromName: idFromNameMock,
    get: namespaceGetMock,
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).GIFT_CLAIM_SCHEDULER;
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/cancel-auto-send", { method: "POST" }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/cancel-auto-send", () => {
  it("returns 401 without session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 404 when purchaser doesn't match session", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: "other", sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    expect((await callRoute()).status).toBe(404);
  });

  it("returns 409 if already self_send", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftDeliveryMethod: "self_send",
    });
    expect((await callRoute()).status).toBe(409);
  });

  it("returns 409 if claim email already fired", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimEmailFiredAt: "2026-05-15T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
  });

  it("returns 502 when Resend send fails (state stays clean)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    sendMock.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute();
    expect(res.status).toBe(502);
    expect(flipMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("clears DO alarm, flips state, and returns claim URL on success", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claimUrl: string };
    expect(body.claimUrl).toContain("/gift/claim?token=");

    expect(stubFetchMock).toHaveBeenCalledOnce();
    const stubReq = stubFetchMock.mock.calls[0][0] as Request;
    expect(new URL(stubReq.url).pathname).toBe("/cancel");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "self_send" }),
    );
    expect(flipMock).toHaveBeenCalledWith("sub_gift", {
      tokenHash: "h".repeat(64),
      firedAtIso: expect.any(String),
    });
    expect(appendEmailFiredMock).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_purchase_confirmation" }),
    );
  });
});
