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
const markGiftClaimSentMock = vi.fn();
const appendEmailFiredMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    flipGiftToSelfSend: flipMock,
    markGiftClaimSent: markGiftClaimSentMock,
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
  markGiftClaimSentMock.mockReset().mockResolvedValue(undefined);
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

  it("returns 502 when Resend send fails (row remains in self_send with provisional token)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    sendMock.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute();
    expect(res.status).toBe(502);
    // Phase 5 Session 4b — atomic flip happens BEFORE send, so the row IS
    // flipped (with a provisional token hash). Resend retry hits resend-link.
    expect(flipMock).toHaveBeenCalledOnce();
    // Real token never persists on send failure.
    expect(markGiftClaimSentMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  // Phase 5 Session 4b — B6.21 atomic-flip-first.
  it("returns 409 when concurrent caller already flipped (flip returns false)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    flipMock.mockResolvedValueOnce(false); // someone else got there first
    const res = await callRoute();
    expect(res.status).toBe(409);
    // No external side-effects when atomic flip loses the race.
    expect(stubFetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(markGiftClaimSentMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("flips atomically THEN cancels DO alarm THEN sends THEN updates real token hash", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claimUrl: string };
    expect(body.claimUrl).toContain("/gift/claim?token=");

    // Verify the ordering by call invocation order.
    const flipCallOrder = flipMock.mock.invocationCallOrder[0]!;
    const cancelCallOrder = stubFetchMock.mock.invocationCallOrder[0]!;
    const sendCallOrder = sendMock.mock.invocationCallOrder[0]!;
    const markCallOrder = markGiftClaimSentMock.mock.invocationCallOrder[0]!;
    expect(flipCallOrder).toBeLessThan(cancelCallOrder);
    expect(cancelCallOrder).toBeLessThan(sendCallOrder);
    expect(sendCallOrder).toBeLessThan(markCallOrder);

    // Flip uses a provisional token hash (NOT the real one yet).
    const flipArgs = flipMock.mock.calls[0]![1] as { tokenHash: string };
    expect(flipArgs.tokenHash).toMatch(/^prov:sub_gift:/);

    // Real token hash is persisted via markGiftClaimSent after send.
    expect(markGiftClaimSentMock).toHaveBeenCalledWith(
      "sub_gift",
      "h".repeat(64),
      expect.any(String),
    );

    // Cancel still fires on the DO.
    expect(stubFetchMock).toHaveBeenCalledOnce();
    const stubReq = stubFetchMock.mock.calls[0][0] as Request;
    expect(new URL(stubReq.url).pathname).toBe("/cancel");

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: "self_send" }),
    );
    expect(appendEmailFiredMock).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_purchase_confirmation" }),
    );
  });
});
