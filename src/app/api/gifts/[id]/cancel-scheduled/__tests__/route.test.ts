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
const applyCancelScheduledMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    applyGiftCancelScheduled: applyCancelScheduledMock,
  };
});

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
  applyCancelScheduledMock.mockReset().mockResolvedValue(true);
  stubFetchMock
    .mockReset()
    .mockResolvedValue(new Response(JSON.stringify({ cancelled: true })));
  getCloudflareContextMock.mockReset().mockResolvedValue({
    env: {
      GIFT_CLAIM_SCHEDULER: { idFromName: idFromNameMock, get: namespaceGetMock },
    },
  });
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/cancel-scheduled", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/cancel-scheduled", () => {
  it("returns 401 without session cookie", async () => {
    cookieGetMock.mockReturnValueOnce(undefined);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 401 with invalid/expired session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 404 when purchaser doesn't match session", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: "other", sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    expect((await callRoute()).status).toBe(404);
  });

  it("returns 409 when gift is not scheduled (self_send)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftDeliveryMethod: "self_send",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applyCancelScheduledMock).not.toHaveBeenCalled();
  });

  it("returns 409 when claim email already fired by alarm", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimEmailFiredAt: "2026-05-15T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applyCancelScheduledMock).not.toHaveBeenCalled();
  });

  it("returns 409 when send-now already fired", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimSentNowAt: "2026-05-19T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applyCancelScheduledMock).not.toHaveBeenCalled();
  });

  it("returns 409 when gift already cancelled", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftCancelledAt: "2026-05-15T00:00:00.000Z",
    });
    expect((await callRoute()).status).toBe(409);
    expect(applyCancelScheduledMock).not.toHaveBeenCalled();
  });

  it("returns 409 when WHERE-guarded UPDATE loses a race", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    applyCancelScheduledMock.mockResolvedValueOnce(false);
    expect((await callRoute()).status).toBe(409);
  });

  it("cancels alarm BEFORE UPDATE on happy path", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: boolean };
    expect(body.updated).toBe(true);

    const cancelOrder = stubFetchMock.mock.invocationCallOrder[0]!;
    const applyOrder = applyCancelScheduledMock.mock.invocationCallOrder[0]!;
    expect(cancelOrder).toBeLessThan(applyOrder);

    const stubReq = stubFetchMock.mock.calls[0][0] as Request;
    expect(new URL(stubReq.url).pathname).toBe("/cancel");

    const applyArgs = applyCancelScheduledMock.mock.calls[0]![1] as {
      cancelledAtIso: string;
      by: string;
      reason: string;
    };
    expect(applyArgs.by).toBe(SCHEDULED_GIFT.email);
    expect(applyArgs.reason).toBe("purchaser-request");
    expect(applyArgs.cancelledAtIso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
