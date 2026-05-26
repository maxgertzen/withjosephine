import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  SESSION_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  createListenSessionForUser: vi.fn(),
  writeAudit: vi.fn(),
  AUDIT_EVENT_TYPE: {
    listen_token_redeemed: "listen_token_redeemed",
    listen_token_id_mismatch: "listen_token_id_mismatch",
  },
}));
vi.mock("@/lib/auth/listenToken", () => ({
  verifyListenToken: vi.fn(),
  LISTEN_TOKEN_TTL_MS: 30 * 24 * 60 * 60 * 1000,
}));
vi.mock("@/lib/auth/listenTokenRedemptions", () => ({
  recordListenTokenRedemption: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi.fn().mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
}));

import { createListenSessionForUser, writeAudit } from "@/lib/auth/listenSession";
import { verifyListenToken } from "@/lib/auth/listenToken";
import { recordListenTokenRedemption } from "@/lib/auth/listenTokenRedemptions";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";

const verifyMock = vi.mocked(verifyListenToken);
const recordMock = vi.mocked(recordListenTokenRedemption);
const sessionMock = vi.mocked(createListenSessionForUser);
const submissionMock = vi.mocked(findSubmissionById);
const auditMock = vi.mocked(writeAudit);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "ada@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://cdn.sanity.io/.../voice.m4a",
  pdfUrl: "https://cdn.sanity.io/.../reading.pdf",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_1",
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
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,
};

beforeEach(() => {
  verifyMock.mockReset();
  recordMock.mockReset();
  sessionMock.mockReset();
  submissionMock.mockReset();
  auditMock.mockReset();
});

function form(values: Record<string, string>): Request {
  const body = new URLSearchParams(values).toString();
  return new Request("https://withjosephine.com/api/listen/sub_1/redeem", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

async function invoke(request: Request) {
  const { POST } = await import("./route");
  return POST(request, { params: Promise.resolve({ id: "sub_1" }) });
}

describe("POST /api/listen/[id]/redeem", () => {
  it("ISC-56: valid token POST -> 303 redirect, Set-Cookie present with __Host-listen_session", async () => {
    submissionMock.mockResolvedValue(SUBMISSION);
    verifyMock.mockResolvedValue({
      valid: true,
      submissionId: "sub_1",
      jti: "jti-abc",
      mintSource: "cron_day7",
      expMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    recordMock.mockResolvedValue({ ok: true });
    sessionMock.mockResolvedValue({
      sessionId: "sess_1",
      cookieValue: "raw-cookie-value",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });

    const response = await invoke(form({ t: "valid.token" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/listen/sub_1?welcome=1",
    );
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        jti: "jti-abc",
        submissionId: "sub_1",
        recipientUserId: "user_1",
        mintSource: "cron_day7",
      }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("__Host-listen_session=raw-cookie-value");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=604800");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toContain("Cookie");
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        submissionId: "sub_1",
        eventType: "listen_token_redeemed",
        success: true,
      }),
    );
  });

  it("ISC-57: same token POSTed twice (second is already_redeemed) -> 303 fallback, no cookie", async () => {
    submissionMock.mockResolvedValue(SUBMISSION);
    verifyMock.mockResolvedValue({
      valid: true,
      submissionId: "sub_1",
      jti: "jti-abc",
      mintSource: "cron_day7",
      expMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    recordMock.mockResolvedValue({ ok: false, reason: "already_redeemed" });

    const response = await invoke(form({ t: "valid.token" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/listen/sub_1");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(sessionMock).not.toHaveBeenCalled();
  });

  it("missing token: 303 fallback, no verify call", async () => {
    const response = await invoke(form({}));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://withjosephine.com/listen/sub_1");
    expect(verifyMock).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("submission has no recipientUserId: 303 fallback, no verify call", async () => {
    submissionMock.mockResolvedValue({ ...SUBMISSION, recipientUserId: null });
    const response = await invoke(form({ t: "valid.token" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("invalid token (expired/bad-sig/recipient_changed): 303 fallback, no cookie", async () => {
    submissionMock.mockResolvedValue(SUBMISSION);
    verifyMock.mockResolvedValue({ valid: false, reason: "expired" });
    const response = await invoke(form({ t: "expired.token" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("token-id mismatch (token says different submissionId): 303 fallback, no cookie", async () => {
    submissionMock.mockResolvedValue(SUBMISSION);
    verifyMock.mockResolvedValue({
      valid: true,
      submissionId: "sub_other",
      jti: "jti-abc",
      mintSource: "cron_day7",
      expMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });
    const response = await invoke(form({ t: "valid.token" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(recordMock).not.toHaveBeenCalled();
  });
});
