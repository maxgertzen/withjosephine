import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/exportToken", () => ({
  verifyExportToken: vi.fn(),
  exportTokenRecipientMatches: vi.fn(),
}));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({
  checkRateLimit: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip_hash_test", userAgentHash: "ua_hash_test" }),
  getClientIpKey: vi.fn().mockReturnValue("ip_test"),
}));
vi.mock("@/lib/auth/listenSession", () => ({
  writeAudit: vi.fn(),
}));
vi.mock("@/lib/request", () => ({
  getClientIp: vi.fn().mockReturnValue("1.2.3.4"),
}));
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
  extractFirstName: vi.fn(() => "Ada"),
}));
vi.mock("@/lib/r2", () => ({
  putObject: vi.fn(),
  getSignedDownloadUrl: vi
    .fn()
    .mockResolvedValue("https://r2.example.com/exports/sub_1/1.zip?sig=abc"),
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
  getSanityWriteClient: vi.fn().mockResolvedValue({
    fetch: vi.fn().mockResolvedValue([]),
  }),
}));

import { exportTokenRecipientMatches, verifyExportToken } from "@/lib/auth/exportToken";
import { writeAudit } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { dbQuery } from "@/lib/booking/persistence/sqlClient";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { wasUserDeleted } from "@/lib/compliance/cascadeDeleteUser";
import { getSignedDownloadUrl, putObject } from "@/lib/r2";
import { sendPrivacyExportEmail } from "@/lib/resend";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerifyToken = vi.mocked(verifyExportToken);
const mockRecipientMatches = vi.mocked(exportTokenRecipientMatches);
const mockTurnstile = vi.mocked(verifyTurnstileToken);
const mockRateLimit = vi.mocked(checkRateLimit);
const mockWriteAudit = vi.mocked(writeAudit);
const mockFindSubmission = vi.mocked(findSubmissionById);
const mockWasDeleted = vi.mocked(wasUserDeleted);
const mockDbQuery = vi.mocked(dbQuery);
const mockPutObject = vi.mocked(putObject);
const mockSignedUrl = vi.mocked(getSignedDownloadUrl);
const mockEmail = vi.mocked(sendPrivacyExportEmail);

const fetchMock = vi.fn();

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
};

const VALID_VERIFY = {
  valid: true as const,
  submissionId: "sub_1",
  recipientUserIdHash: "hash_a",
  jti: "j".repeat(32),
  mintSource: "order_confirmation" as const,
  expMs: Date.now() + 1_000_000,
};

beforeEach(() => {
  mockVerifyToken.mockReset().mockResolvedValue(VALID_VERIFY);
  mockRecipientMatches.mockReset().mockResolvedValue(true);
  mockTurnstile.mockReset().mockResolvedValue(true);
  mockRateLimit.mockReset().mockResolvedValue(true);
  mockWriteAudit.mockReset().mockResolvedValue(undefined);
  mockFindSubmission.mockReset().mockResolvedValue(SUBMISSION);
  mockWasDeleted.mockReset().mockResolvedValue(false);
  mockDbQuery.mockReset().mockResolvedValue([]);
  mockPutObject.mockReset().mockResolvedValue(undefined);
  mockSignedUrl
    .mockReset()
    .mockResolvedValue("https://r2.example.com/exports/sub_1/1.zip?sig=abc");
  mockEmail.mockReset().mockResolvedValue({ kind: "sent", resendId: "resend_xyz" });
  fetchMock.mockReset().mockResolvedValue(new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function callRoute(body: unknown = { token: "tok", turnstileToken: "ts" }): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/privacy/export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/privacy/export", () => {
  it("returns 400 when the token is missing", async () => {
    const res = await callRoute({ turnstileToken: "ts" });
    expect(res.status).toBe(400);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 429 when the CF rate limiter rejects", async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(429);
    expect(mockTurnstile).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 400 when the Turnstile token is missing", async () => {
    const res = await callRoute({ token: "tok" });
    expect(res.status).toBe(400);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 400 when Turnstile verification fails", async () => {
    mockTurnstile.mockResolvedValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(400);
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 403 + audit when the export token is invalid", async () => {
    mockVerifyToken.mockResolvedValueOnce({ valid: false, reason: "bad_signature" });
    const res = await callRoute();
    expect(res.status).toBe(403);
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "export_token_invalid", success: false }),
    );
    expect(mockFindSubmission).not.toHaveBeenCalled();
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 404 when the token's submission does not exist", async () => {
    mockFindSubmission.mockResolvedValueOnce(null);
    const res = await callRoute();
    expect(res.status).toBe(404);
    expect(mockPutObject).not.toHaveBeenCalled();
  });

  it("returns 403 + cross-user audit when the recipient binding no longer matches", async () => {
    mockRecipientMatches.mockResolvedValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(403);
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "export_cross_user_denied",
        submissionId: "sub_1",
        success: false,
      }),
    );
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it("returns 410 when the recipient was cascade-deleted", async () => {
    mockWasDeleted.mockResolvedValueOnce(true);
    const res = await callRoute();
    expect(res.status).toBe(410);
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it("returns 429 + export_throttled audit when an export ran within the window", async () => {
    mockDbQuery.mockResolvedValueOnce([{ timestamp: Date.now() - 60_000 }] as never);
    const res = await callRoute();
    expect(res.status).toBe(429);
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "export_throttled", submissionId: "sub_1" }),
    );
    expect(mockPutObject).not.toHaveBeenCalled();
    expect(mockEmail).not.toHaveBeenCalled();
  });

  it("throttle query is keyed by the token's submissionId", async () => {
    await callRoute();
    const throttleCall = mockDbQuery.mock.calls.find(([sql]) =>
      String(sql).includes("event_type = 'export_request'"),
    );
    expect(throttleCall).toBeDefined();
    expect(throttleCall?.[1]?.[0]).toBe("sub_1");
  });

  it("builds a single-order ZIP, uploads, signs, emails the order address, audits", async () => {
    const res = await callRoute();

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.expiresInSeconds).toBe(7 * 24 * 60 * 60);

    expect(mockFindSubmission).toHaveBeenCalledWith("sub_1");
    expect(mockPutObject).toHaveBeenCalledOnce();
    const [key, , contentType] = mockPutObject.mock.calls[0]!;
    expect(key).toMatch(/^exports\/sub_1\/\d+\.zip$/);
    expect(contentType).toBe("application/zip");
    expect(mockSignedUrl).toHaveBeenCalledWith(
      expect.stringMatching(/^exports\/sub_1\//),
      7 * 24 * 60 * 60,
    );
    expect(mockEmail).toHaveBeenCalledWith({
      to: "ada@example.com",
      firstName: expect.any(String),
      downloadUrl: "https://r2.example.com/exports/sub_1/1.zip?sig=abc",
      expiryDays: 7,
    });
    expect(mockWriteAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_a",
        submissionId: "sub_1",
        eventType: "export_request",
        success: true,
      }),
    );
  });

  it("scopes the export strictly to the token's submissionId and its order email", async () => {
    // A token minted for a different order resolves ONLY to that order; the
    // download link is emailed to THAT order's registered address.
    mockVerifyToken.mockResolvedValueOnce({
      ...VALID_VERIFY,
      submissionId: "sub_other",
    });
    mockFindSubmission.mockResolvedValueOnce({
      ...SUBMISSION,
      _id: "sub_other",
      email: "other-owner@example.com",
      recipientUserId: "user_other",
    });

    const res = await callRoute();
    expect(res.status).toBe(202);
    expect(mockFindSubmission).toHaveBeenCalledWith("sub_other");
    expect(mockFindSubmission).not.toHaveBeenCalledWith("sub_1");
    const [key] = mockPutObject.mock.calls[0]!;
    expect(key).toMatch(/^exports\/sub_other\//);
    expect(mockEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "other-owner@example.com" }),
    );
  });

  it("fetches each asset URL (photo + voice note + PDF)", async () => {
    await callRoute();
    const fetchedUrls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(fetchedUrls).toContain("https://images.withjosephine.com/submissions/sub_1/photo.jpg");
    expect(fetchedUrls).toContain("https://cdn.sanity.io/files/abc/voice.mp3");
    expect(fetchedUrls).toContain("https://cdn.sanity.io/files/abc/reading.pdf");
  });

  it("ships the bundle even when an asset fetch 404s (degrades to placeholder)", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 404 }));
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([1, 2]), { status: 200 }));
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array([3, 4]), { status: 200 }));
    const res = await callRoute();
    expect(res.status).toBe(202);
    expect(mockPutObject).toHaveBeenCalled();
  });

  it("returns 500 if the R2 upload throws", async () => {
    mockPutObject.mockRejectedValueOnce(new Error("R2 503"));
    const res = await callRoute();
    expect(res.status).toBe(500);
    expect(mockEmail).not.toHaveBeenCalled();
  });
});
