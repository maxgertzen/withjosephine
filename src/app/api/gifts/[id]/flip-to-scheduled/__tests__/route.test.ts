import { beforeEach, describe, expect, it, vi } from "vitest";

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
    flipGiftToScheduled: flipMock,
    appendEmailFired: appendEmailFiredMock,
  };
});

const sendMock = vi.fn();
vi.mock("@/lib/resend", () => ({ sendGiftPurchaseConfirmation: sendMock }));

const stubFetchMock = vi.fn();
const namespaceGetMock = vi.fn(() => ({ fetch: stubFetchMock }));
const idFromNameMock = vi.fn(() => ({ toString: () => "do-id" }));

const getCloudflareContextMock = vi.fn();
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}));

const PURCHASER_ID = "user_purchaser";
const FUTURE_ISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const SELF_SEND_GIFT: SubmissionRecord = {
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
  purchaserTimeZone: null,
  recipientEmail: null,
  giftDeliveryMethod: "self_send",
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: "h".repeat(64),
  giftClaimEmailFiredAt: "2026-05-01T00:00:01.000Z",
  giftClaimedAt: null,
  giftCancelledAt: null,
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,};

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  findSubmissionMock.mockReset();
  flipMock.mockReset().mockResolvedValue(true);
  appendEmailFiredMock.mockReset().mockResolvedValue(undefined);
  sendMock.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_flip_scheduled" });
  stubFetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ scheduled: true })));
  getCloudflareContextMock.mockReset().mockResolvedValue({
    env: {
      GIFT_CLAIM_SCHEDULER: { idFromName: idFromNameMock, get: namespaceGetMock },
    },
  });
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/flip-to-scheduled", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
    }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/flip-to-scheduled (I-12)", () => {
  it("returns 401 without session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    expect(
      (await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"})).status,
    ).toBe(401);
  });

  it("returns 404 when purchaser doesn't match session", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: "other", sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    expect(
      (await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"})).status,
    ).toBe(404);
  });

  it("returns 409 if already scheduled", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce({
      ...SELF_SEND_GIFT,
      giftDeliveryMethod: "scheduled",
    });
    expect(
      (await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"})).status,
    ).toBe(409);
  });

  it("returns 409 if already claimed", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce({
      ...SELF_SEND_GIFT,
      giftClaimedAt: "2026-05-15T00:00:00.000Z",
    });
    expect(
      (await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"})).status,
    ).toBe(409);
  });

  it("returns 422 when recipient email is the purchaser's own email", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    const res = await callRoute({
      recipientEmail: "purchaser@example.com",
      giftSendAt: FUTURE_ISO, purchaserTimeZone: "America/Los_Angeles",
    });
    expect(res.status).toBe(422);
    expect(flipMock).not.toHaveBeenCalled();
  });

  it("returns 422 when giftSendAt is in the past", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    const past = new Date(Date.now() - 1000).toISOString();
    const res = await callRoute({ recipientEmail: "r@example.com", giftSendAt: past , purchaserTimeZone: "America/Los_Angeles"});
    expect(res.status).toBe(422);
    expect(flipMock).not.toHaveBeenCalled();
  });

  it("returns 409 when concurrent caller already flipped (flip returns false)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    flipMock.mockResolvedValueOnce(false);
    const res = await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"});
    expect(res.status).toBe(409);
    expect(stubFetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("returns 502 when DO alarm scheduling fails (binding missing or unreachable)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    stubFetchMock.mockResolvedValueOnce(new Response("Server error", { status: 500 }));
    const res = await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"});
    expect(res.status).toBe(502);
    expect(sendMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("returns 502 when GIFT_CLAIM_SCHEDULER binding is absent on env (production bug reproducer)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);
    getCloudflareContextMock.mockReset().mockResolvedValueOnce({ env: {} });
    const res = await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"});
    expect(res.status).toBe(502);
    expect(stubFetchMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("happy path: flips, schedules DO alarm, sends scheduled-variant purchaser email, appends audit", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: null });
    findSubmissionMock.mockResolvedValueOnce(SELF_SEND_GIFT);

    const res = await callRoute({ recipientEmail: "r@example.com", giftSendAt: FUTURE_ISO , purchaserTimeZone: "America/Los_Angeles"});
    expect(res.status).toBe(200);

    expect(flipMock).toHaveBeenCalledOnce();
    const flipArgs = flipMock.mock.calls[0]?.[1];
    expect(flipArgs.recipientEmail).toBe("r@example.com");
    expect(flipArgs.giftSendAt).toBe(FUTURE_ISO);
    expect(flipArgs.tokenHash).toMatch(/^prov:flip-to-scheduled:/);

    expect(stubFetchMock).toHaveBeenCalledOnce();
    expect(sendMock).toHaveBeenCalledOnce();
    const sendArgs = sendMock.mock.calls[0]?.[0];
    expect(sendArgs.variant).toBe("scheduled");
    // sendAtDisplay is formatted via formatSendAt — assert it's NOT the raw ISO.
    expect(sendArgs.sendAtDisplay).not.toBe(FUTURE_ISO);
    expect(sendArgs.sendAtDisplay).toMatch(/at \d/);
    expect(appendEmailFiredMock).toHaveBeenCalledOnce();
  });
});
