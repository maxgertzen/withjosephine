import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EmailFiredEntry, SubmissionRecord } from "@/lib/booking/submissions";

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
const markMock = vi.fn();
const appendEmailFiredMock = vi.fn();
vi.mock("@/lib/booking/submissions", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/submissions")>(
    "@/lib/booking/submissions",
  );
  return {
    ...actual,
    findSubmissionById: findSubmissionMock,
    markGiftClaimSent: markMock,
    appendEmailFired: appendEmailFiredMock,
  };
});

const issueTokenMock = vi.fn();
vi.mock("@/lib/booking/giftClaim", () => ({ issueGiftClaimToken: issueTokenMock }));

const sendMock = vi.fn();
vi.mock("@/lib/resend", () => ({ sendGiftPurchaseConfirmation: sendMock }));

const PURCHASER_ID = "user_purchaser";

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
  recipientEmail: null,
  giftDeliveryMethod: "self_send",
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: "old".padEnd(64, "0"),
  giftClaimEmailFiredAt: "2026-05-01T00:00:00.000Z",
  giftClaimedAt: null,
  giftCancelledAt: null,
  emailsFired: [],
};

function gift(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return { ...SELF_SEND_GIFT, ...overrides };
}

beforeEach(() => {
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-val" });
  getActiveSessionMock.mockReset();
  findSubmissionMock.mockReset();
  markMock.mockReset().mockResolvedValue(undefined);
  appendEmailFiredMock.mockReset().mockResolvedValue(undefined);
  issueTokenMock.mockReset().mockResolvedValue({
    token: "a".repeat(64),
    tokenHash: "n".repeat(64),
    claimUrl: "https://test.local/gift/claim?token=" + "a".repeat(64),
  });
  sendMock.mockReset().mockResolvedValue({ resendId: "msg_resend" });
});

afterEach(() => {
  vi.useRealTimers();
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("https://test.local/api/gifts/sub_gift/resend-link", { method: "POST" }),
    { params: Promise.resolve({ id: "sub_gift" }) },
  );
}

describe("POST /api/gifts/[id]/resend-link", () => {
  it("returns 401 without session", async () => {
    getActiveSessionMock.mockResolvedValueOnce(null);
    expect((await callRoute()).status).toBe(401);
  });

  it("returns 409 when gift is not self_send", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(
      gift({ giftDeliveryMethod: "scheduled", giftClaimEmailFiredAt: null }),
    );
    expect((await callRoute()).status).toBe(409);
  });

  it("returns 409 when already claimed", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(gift({ giftClaimedAt: "2026-05-05T00:00:00.000Z" }));
    expect((await callRoute()).status).toBe(409);
  });

  it("returns 429 when a resend happened in the last hour", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const recent: EmailFiredEntry = {
      type: "gift_resend",
      sentAt: "2026-05-10T11:30:00.000Z",
      resendId: "msg_prev",
    };
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(gift({ emailsFired: [recent] }));
    const res = await callRoute();
    expect(res.status).toBe(429);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 429 when ≥3 resends within 24h", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T12:00:00.000Z"));
    const window24: EmailFiredEntry[] = [
      { type: "gift_resend", sentAt: "2026-05-10T02:00:00.000Z", resendId: "a" },
      { type: "gift_resend", sentAt: "2026-05-09T20:00:00.000Z", resendId: "b" },
      { type: "gift_resend", sentAt: "2026-05-09T16:00:00.000Z", resendId: "c" },
    ];
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(gift({ emailsFired: window24 }));
    const res = await callRoute();
    expect(res.status).toBe(429);
  });

  it("returns 200 with claim URL and appends gift_resend entry", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(gift());
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claimUrl: string };
    expect(body.claimUrl).toContain("/gift/claim?token=");
    expect(markMock).toHaveBeenCalledWith(
      "sub_gift",
      "n".repeat(64),
      expect.any(String),
    );
    expect(appendEmailFiredMock).toHaveBeenCalledWith(
      "sub_gift",
      expect.objectContaining({ type: "gift_resend", resendId: "msg_resend" }),
    );
  });

  it("returns 502 when Resend send fails (state untouched)", async () => {
    getActiveSessionMock.mockResolvedValueOnce({ userId: PURCHASER_ID, sessionId: "s" });
    findSubmissionMock.mockResolvedValueOnce(gift());
    sendMock.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute();
    expect(res.status).toBe(502);
    expect(markMock).not.toHaveBeenCalled();
    expect(appendEmailFiredMock).not.toHaveBeenCalled();
  });
});
