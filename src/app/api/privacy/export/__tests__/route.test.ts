import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("@/lib/auth/listenSession", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "@/lib/auth/listenSession",
  );
  return {
    ...actual,
    getActiveSession: vi.fn(),
    writeAudit: vi.fn(),
  };
});
vi.mock("@/lib/auth/users", () => ({
  findUserById: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip_hash_test", userAgentHash: "ua_hash_test" }),
  getClientIpKey: vi.fn().mockReturnValue("ip_test"),
}));
vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
}));
vi.mock("@/lib/r2", () => ({
  putObject: vi.fn(),
  getSignedDownloadUrl: vi
    .fn()
    .mockResolvedValue("https://r2.example.com/exports/user_a/1.zip?sig=abc"),
}));
vi.mock("@/lib/resend", () => ({
  sendPrivacyExportEmail: vi.fn().mockResolvedValue({ kind: "sent", resendId: "resend_xyz" }),
}));
vi.mock("@/lib/compliance/cascadeDeleteUser", () => ({
  wasUserDeleted: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/booking/persistence/sqlClient", () => ({
  dbQuery: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn().mockReturnValue({
    fetch: vi.fn().mockResolvedValue([]),
  }),
}));

import { cookies } from "next/headers";

import {
  COOKIE_NAME,
  getActiveSession,
  writeAudit,
} from "@/lib/auth/listenSession";
import { findUserById } from "@/lib/auth/users";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { listSubmissionsByRecipientUserId } from "@/lib/booking/submissions";
import { wasUserDeleted } from "@/lib/compliance/cascadeDeleteUser";
import { getSignedDownloadUrl, putObject } from "@/lib/r2";
import { sendPrivacyExportEmail } from "@/lib/resend";

const mockCookies = vi.mocked(cookies);
const mockSession = vi.mocked(getActiveSession);
const mockWasDeleted = vi.mocked(wasUserDeleted);
const mockDbQuery = vi.mocked(dbQuery);
const mockAudit = vi.mocked(writeAudit);
const mockFindUser = vi.mocked(findUserById);
const mockListSubs = vi.mocked(listSubmissionsByRecipientUserId);
const mockPutObject = vi.mocked(putObject);
const mockSignedUrl = vi.mocked(getSignedDownloadUrl);
const mockEmail = vi.mocked(sendPrivacyExportEmail);

const fetchMock = vi.fn();

function stubCookies(value: string | null) {
  mockCookies.mockResolvedValue({
    get: (name: string) =>
      name === COOKIE_NAME && value !== null ? { value } : undefined,
  } as never);
}

import type { SubmissionRecord } from "@/lib/booking/submissions";

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "ada@example.com",
  responses: [
    { fieldKey: "first_name", fieldLabelSnapshot: "First name", fieldType: "shortText", value: "Ada" },
  ],
  createdAt: "2026-04-20T10:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 9900,
  amountPaidCurrency: "usd",
  paidAt: "2026-04-21T10:00:00Z",
  recipientUserId: "user_a",
  photoR2Key: "submissions/sub_1/photo.jpg",
  stripeSessionId: "cs_1",
  voiceNoteUrl: "https://cdn.sanity.io/files/abc/voice.mp3",
  pdfUrl: "https://cdn.sanity.io/files/abc/reading.pdf",
  deliveredAt: "2026-04-28T10:00:00Z",
  emailsFired: [{ type: "order_confirmation", sentAt: "2026-04-21T10:00:01Z", resendId: "msg_a" }],
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
  mockCookies.mockReset();
  mockSession.mockReset();
  mockWasDeleted.mockReset().mockResolvedValue(false);
  mockDbQuery.mockReset().mockResolvedValue([]);
  mockAudit.mockReset().mockResolvedValue(undefined);
  mockFindUser.mockReset();
  mockListSubs.mockReset();
  mockPutObject.mockReset().mockResolvedValue(undefined);
  mockSignedUrl
    .mockReset()
    .mockResolvedValue("https://r2.example.com/exports/user_a/1.zip?sig=abc");
  mockEmail.mockReset().mockResolvedValue({ kind: "sent", resendId: "resend_xyz" });
  fetchMock.mockReset().mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/privacy/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("POST /api/privacy/export", () => {
  it("returns 403 + audit when listen-session cookie is missing", async () => {
    stubCookies(null);
    const res = await callRoute();
    expect(res.status).toBe(403);
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: "listen_session_invalid",
        success: false,
      }),
    );
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 403 when session is present but user lookup fails", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce(null);
    const res = await callRoute();
    expect(res.status).toBe(403);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("builds ZIP, uploads to R2, signs URL, emails user, and audits export_request on success", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockListSubs.mockResolvedValueOnce([SUBMISSION]);

    const res = await callRoute();

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.submissionCount).toBe(1);
    expect(body.expiresInSeconds).toBe(7 * 24 * 60 * 60);

    expect(mockPutObject).toHaveBeenCalledOnce();
    const [key, , contentType] = mockPutObject.mock.calls[0]!;
    expect(key).toMatch(/^exports\/user_a\/\d+\.zip$/);
    expect(contentType).toBe("application/zip");

    expect(mockSignedUrl).toHaveBeenCalledWith(expect.stringMatching(/^exports\/user_a\//), 7 * 24 * 60 * 60);
    expect(mockEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      downloadUrl: "https://r2.example.com/exports/user_a/1.zip?sig=abc",
      submissionCount: 1,
      expiryDays: 7,
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_a",
        eventType: "export_request",
        success: true,
      }),
    );
  });

  it("fetches each asset URL (photo + voice note + PDF) in the bundle", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockListSubs.mockResolvedValueOnce([SUBMISSION]);

    await callRoute();

    const fetchedUrls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(fetchedUrls).toContain("https://images.withjosephine.com/submissions/sub_1/photo.jpg");
    expect(fetchedUrls).toContain("https://cdn.sanity.io/files/abc/voice.mp3");
    expect(fetchedUrls).toContain("https://cdn.sanity.io/files/abc/reading.pdf");
  });

  it("ships the bundle even when an asset fetch 404s (degrades to placeholder)", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockListSubs.mockResolvedValueOnce([SUBMISSION]);
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 404 })); // photo 404
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2]), { status: 200 })); // voice ok
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([3, 4]), { status: 200 })); // pdf ok

    const res = await callRoute();
    expect(res.status).toBe(202);
    expect(mockPutObject).toHaveBeenCalled();
  });

  it("handles a user with zero submissions (still ships an empty bundle + audit)", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockListSubs.mockResolvedValueOnce([]);

    const res = await callRoute();

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.submissionCount).toBe(0);
    expect(mockPutObject).toHaveBeenCalledOnce();
    expect(mockEmail).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 410 when the user was already cascade-deleted (idempotency)", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockWasDeleted.mockResolvedValueOnce(true);

    const res = await callRoute();
    expect(res.status).toBe(410);
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it("returns 429 + writes export_throttled audit when recent export within 5 min", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockDbQuery.mockResolvedValueOnce([{ timestamp: Date.now() - 60_000 }] as never);

    const res = await callRoute();
    expect(res.status).toBe(429);
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "export_throttled", success: false }),
    );
  });

  it("returns 413 when submission count exceeds MAX_SUBMISSIONS_PER_EXPORT", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    const many = Array.from({ length: 51 }, (_, i) => ({ ...SUBMISSION, _id: `sub_${i}` }));
    mockListSubs.mockResolvedValueOnce(many);

    const res = await callRoute();
    expect(res.status).toBe(413);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 500 if R2 upload throws", async () => {
    stubCookies("session-token");
    mockSession.mockResolvedValueOnce({ userId: "user_a", sessionId: "ses_1" } as never);
    mockFindUser.mockResolvedValueOnce({ id: "user_a", email: "ada@example.com" });
    mockListSubs.mockResolvedValueOnce([SUBMISSION]);
    mockPutObject.mockRejectedValueOnce(new Error("R2 503"));

    const res = await callRoute();
    expect(res.status).toBe(500);
    expect(mockEmail).not.toHaveBeenCalled();
  });
});
