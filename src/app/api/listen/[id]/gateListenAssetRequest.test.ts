import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
  writeAudit: vi.fn(),
}));
vi.mock("@/lib/auth/rateLimit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/auth/requestAudit", () => ({
  getClientIpKey: vi.fn(() => "ip-key"),
  getRequestAuditContext: vi.fn(async () => ({ ipHash: "ip_hash", userAgentHash: "ua_hash" })),
}));
vi.mock("@/lib/booking/submissions", () => ({ findSubmissionListenContext: vi.fn() }));

import { cookies } from "next/headers";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { getActiveSession, writeAudit } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { findSubmissionListenContext } from "@/lib/booking/submissions";

import { gateListenAssetRequest } from "./proxySanityAsset";

const cookiesMock = vi.mocked(cookies);
const getActiveSessionMock = vi.mocked(getActiveSession);
const writeAuditMock = vi.mocked(writeAudit);
const checkRateLimitMock = vi.mocked(checkRateLimit);
const findContextMock = vi.mocked(findSubmissionListenContext);

const CONTEXT = {
  submissionId: "sub_alice",
  recipientUserId: "user_alice",
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  firstName: "Alice",
  lastName: "Example",
};

function withCookie(value: string | undefined) {
  cookiesMock.mockResolvedValue({
    get: () => (value === undefined ? undefined : { name: "__Host-listen_session", value }),
  } as unknown as Awaited<ReturnType<typeof cookies>>);
}

function gate() {
  return gateListenAssetRequest(new Request("https://withjosephine.com/api/listen/sub_alice/audio"), "sub_alice");
}

beforeEach(() => {
  vi.clearAllMocks();
  checkRateLimitMock.mockResolvedValue(true);
  withCookie("cookie_value");
  findContextMock.mockResolvedValue(CONTEXT as Awaited<ReturnType<typeof findSubmissionListenContext>>);
  getActiveSessionMock.mockResolvedValue({ userId: "user_alice", sessionId: "sess_1" });
});

describe("gateListenAssetRequest", () => {
  it("lets the submission's recipient through with the asset context", async () => {
    const result = await gate();

    expect(result).toEqual({
      ok: true,
      asset: {
        voiceNoteUrl: CONTEXT.voiceNoteUrl,
        pdfUrl: CONTEXT.pdfUrl,
        readingSlug: CONTEXT.readingSlug,
        readingName: CONTEXT.readingName,
        submissionId: CONTEXT.submissionId,
        firstName: CONTEXT.firstName,
        lastName: CONTEXT.lastName,
      },
    });
    expect(writeAuditMock).not.toHaveBeenCalled();
  });

  it("denies another user's session and audits a cross-user probe", async () => {
    getActiveSessionMock.mockResolvedValue({ userId: "user_bob", sessionId: "sess_2" });

    const result = await gate();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(403);
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_bob",
        submissionId: "sub_alice",
        eventType: AUDIT_EVENT_TYPE.listen_cross_user_denied,
        success: false,
      }),
    );
  });

  it("denies a submission with no recipient", async () => {
    findContextMock.mockResolvedValue({ ...CONTEXT, recipientUserId: null } as Awaited<
      ReturnType<typeof findSubmissionListenContext>
    >);

    const result = await gate();

    expect(result.ok).toBe(false);
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_alice",
        eventType: AUDIT_EVENT_TYPE.listen_session_invalid,
      }),
    );
  });

  it("denies a request without a cookie and never looks up a session", async () => {
    withCookie(undefined);

    const result = await gate();

    expect(result.ok).toBe(false);
    expect(getActiveSessionMock).not.toHaveBeenCalled();
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, eventType: AUDIT_EVENT_TYPE.listen_session_invalid }),
    );
  });

  it("denies an expired or unknown session", async () => {
    getActiveSessionMock.mockResolvedValue(null);

    const result = await gate();

    expect(result.ok).toBe(false);
    expect(writeAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null, eventType: AUDIT_EVENT_TYPE.listen_session_invalid }),
    );
  });

  it("answers 429 when the rate limit is hit", async () => {
    checkRateLimitMock.mockResolvedValue(false);

    const result = await gate();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.response.status).toBe(429);
    expect(findContextMock).not.toHaveBeenCalled();
  });
});
