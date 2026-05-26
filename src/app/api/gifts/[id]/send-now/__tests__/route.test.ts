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
const applySendNowMock = vi.fn();
const appendEmailFiredMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    applyGiftSendNow: applySendNowMock,
    appendEmailFired: appendEmailFiredMock,
  };
});

const issueTokenMock = vi.fn();
vi.mock("@/lib/booking/giftClaim", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/giftClaim")>(
    "@/lib/booking/giftClaim",
  );
  return { ...actual, issueGiftClaimToken: issueTokenMock };
});

const sendMock = vi.fn();
vi.mock("@/lib/resend", () => ({ sendGiftClaimEmail: sendMock }));

const stubFetchMock = vi.fn();
const namespaceGetMock = vi.fn(() => ({ fetch: stubFetchMock }));
const idFromNameMock = vi.fn(() => ({ toString: () => "do-id" }));

const getCloudflareContextMock = vi.fn();
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}));

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
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,
};

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  findSubmissionMock.mockReset();
  applySendNowMock.mockReset().mockResolvedValue(true);
  appendEmailFiredMock.mockReset().mockResolvedValue(undefined);
  issueTokenMock.mockReset().mockResolvedValue({
    token: "a".repeat(64),
    tokenHash: "h".repeat(64),
    claimUrl: "https://test.local/gift/claim?token=" + "a".repeat(64),
  });
  sendMock.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_send_now" });
  stubFetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ cancelled: true })));
  getCloudflareContextMock.mockReset().mockResolvedValue({
    env: {
      GIFT_CLAIM_SCHEDULER: { idFromName: idFromNameMock, get: namespaceGetMock },
    },
  });
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/send-now", { method: "POST" }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/send-now", () => {
  it("returns 401 without session cookie", async () => {
    cookieGetMock.mockReturnValueOnce(undefined);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 401 with invalid/expired session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 404 when purchaser doesn't match session", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: "other", sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    expect((await callRoute()).status).toBe(404);
  });

  it("returns 409 when gift is not scheduled (self_send)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftDeliveryMethod: "self_send",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applySendNowMock).not.toHaveBeenCalled();
  });

  it("returns 409 when claim email already fired", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimEmailFiredAt: "2026-05-15T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applySendNowMock).not.toHaveBeenCalled();
  });

  it("returns 409 when gift already cancelled", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftCancelledAt: "2026-05-15T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applySendNowMock).not.toHaveBeenCalled();
  });

  it("returns 409 when send-now already fired (double-click idempotency)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimSentNowAt: "2026-05-19T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applySendNowMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 409 when WHERE-guarded UPDATE loses a race", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    applySendNowMock.mockResolvedValueOnce(false); // concurrent caller landed first
    const res = await callRoute();
    expect(res.status).toBe(409);
    expect(sendMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Resend send fails (audit columns remain)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    sendMock.mockResolvedValueOnce({ kind: "failed", error: "test stub failure" });
    const res = await callRoute();
    expect(res.status).toBe(502);
    expect(applySendNowMock).toHaveBeenCalledOnce();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });

  it("cancels alarm THEN UPDATE THEN send THEN appendEmailFired on happy path", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: boolean };
    expect(body.updated).toBe(true);

    const cancelOrder = stubFetchMock.mock.invocationCallOrder[0]!;
    const applyOrder = applySendNowMock.mock.invocationCallOrder[0]!;
    const sendOrder = sendMock.mock.invocationCallOrder[0]!;
    const appendOrder = appendEmailFiredMock.mock.invocationCallOrder[0]!;
    expect(cancelOrder).toBeLessThan(applyOrder);
    expect(applyOrder).toBeLessThan(sendOrder);
    expect(sendOrder).toBeLessThan(appendOrder);

    const applyArgs = applySendNowMock.mock.calls[0]![1] as {
      tokenHash: string;
      sentNowAtIso: string;
      actor: string;
      priorAlarmAt: string | null;
    };
    expect(applyArgs.tokenHash).toBe("h".repeat(64));
    expect(applyArgs.actor).toBe(SCHEDULED_GIFT.email);
    expect(applyArgs.priorAlarmAt).toBe(SCHEDULED_GIFT.giftSendAt);

    const stubReq = stubFetchMock.mock.calls[0][0] as Request;
    expect(new URL(stubReq.url).pathname).toBe("/cancel");

    expect(appendEmailFiredMock).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_claim", resendId: "msg_send_now" }),
    );
  });

  it("passes Idempotency-Key gift:{id}:claim to the Resend send", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s", elevatedAt: Date.now() });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    await callRoute();
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "gift:sub_gift:claim",
        variant: "first_send",
        recipientEmail: SCHEDULED_GIFT.recipientEmail,
      }),
    );
  });

  it("returns 401 elevation_required when session is not elevated", async () => {
    getActiveSessionMock.mockResolvedValueOnce({
      userId: PURCHASER_ID,
      sessionId: "s",
      elevatedAt: null,
    });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string; contactMailto: string };
    expect(body.error).toBe("elevation_required");
    expect(body.contactMailto).toMatch(/^mailto:/);
    expect(applySendNowMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 401 elevation_required when elevatedAt is past the 10-min TTL", async () => {
    const stale = Date.now() - 11 * 60 * 1000;
    getActiveSessionMock.mockResolvedValueOnce({
      userId: PURCHASER_ID,
      sessionId: "s",
      elevatedAt: stale,
    });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("elevation_required");
  });
});
