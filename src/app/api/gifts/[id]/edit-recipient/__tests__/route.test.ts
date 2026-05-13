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
const editGiftRecipientMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    editGiftRecipient: editGiftRecipientMock,
  };
});

const stubFetchMock = vi.fn();
const idFromNameMock = vi.fn(() => ({ toString: () => "do-id" }));
const namespaceGetMock = vi.fn(() => ({ fetch: stubFetchMock }));

beforeEach(() => {
  cookieGetMock.mockReset();
  getActiveSessionMock.mockReset();
  findSubmissionMock.mockReset();
  editGiftRecipientMock.mockReset().mockResolvedValue({ updated: true, responses: [] });
  stubFetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ scheduled: true })));
  idFromNameMock.mockClear();
  namespaceGetMock.mockClear();
  (globalThis as Record<string, unknown>).GIFT_CLAIM_SCHEDULER = {
    idFromName: idFromNameMock,
    get: namespaceGetMock,
  };
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).GIFT_CLAIM_SCHEDULER;
});

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

async function callRoute(args: {
  hasCookie?: boolean;
  body: unknown;
}): Promise<Response> {
  cookieGetMock.mockReturnValue(
    args.hasCookie === false ? undefined : { value: "cookie-val" },
  );
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/edit-recipient", {
      method: "POST",
      body: JSON.stringify(args.body),
    }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/edit-recipient", () => {
  it("returns 401 when no cookie", async () => {
    const res = await callRoute({ hasCookie: false, body: {} });
    expect(res.status).toBe(401);
  });

  it("returns 401 when cookie has no active session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    const res = await callRoute({ body: {} });
    expect(res.status).toBe(401);
  });

  it("returns 404 when purchaser_user_id does not match session", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: "other_user", sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({ body: { recipientEmail: "new@example.com" } });
    expect(res.status).toBe(404);
  });

  it("returns 404 when submission missing", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(null);
    const res = await callRoute({ body: { recipientEmail: "new@example.com" } });
    expect(res.status).toBe(404);
  });

  it("returns 409 when claim email already fired", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce({
      ...SCHEDULED_GIFT,
      giftClaimEmailFiredAt: "2026-05-15T00:00:00.000Z",
    });
    const res = await callRoute({ body: { recipientEmail: "new@example.com" } });
    expect(res.status).toBe(409);
  });

  it("returns 422 when recipient email equals purchaser email", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({ body: { recipientEmail: "purchaser@example.com" } });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: { field: string }[] };
    expect(body.fieldErrors[0]?.field).toBe("recipientEmail");
  });

  it("returns 422 when recipientName too long", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({ body: { recipientName: "x".repeat(120) } });
    expect(res.status).toBe(422);
  });

  it("returns 422 when recipientEmail exceeds RFC 5321 254-char cap", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const longEmail = `${"x".repeat(245)}@example.com`; // 257 chars
    const res = await callRoute({ body: { recipientEmail: longEmail } });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: { field: string }[] };
    expect(body.fieldErrors[0]?.field).toBe("recipientEmail");
  });

  it("treats plus-aliased purchaser email as the purchaser (rejects)", async () => {
    // alice+gift@example.com normalizes to alice@example.com; gifting to a
    // plus-alias of your own inbox is still gifting to yourself.
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({
      body: { recipientEmail: "purchaser+gift@example.com" },
    });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { fieldErrors: { field: string }[] };
    expect(body.fieldErrors[0]?.field).toBe("recipientEmail");
  });

  it("returns 200 and re-schedules DO alarm when gift_send_at changes", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const newSendAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
    const res = await callRoute({ body: { giftSendAt: newSendAt } });
    expect(res.status).toBe(200);
    expect(editGiftRecipientMock).toHaveBeenCalledWith(
      "sub_gift",
      { giftSendAt: expect.any(String) },
      expect.objectContaining({ _id: "sub_gift" }),
    );
    expect(stubFetchMock).toHaveBeenCalledOnce();
    const stubReq = stubFetchMock.mock.calls[0][0] as Request;
    expect(new URL(stubReq.url).pathname).toBe("/schedule");
  });

  it("returns 200 when only recipient_email changes (no DO call)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(SCHEDULED_GIFT);
    const res = await callRoute({ body: { recipientEmail: "new@example.com" } });
    expect(res.status).toBe(200);
    expect(stubFetchMock).not.toHaveBeenCalled();
  });
});
