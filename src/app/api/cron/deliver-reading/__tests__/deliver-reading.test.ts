import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  buildSubmissionContext: vi.fn().mockReturnValue({
    id: "sub_force",
    email: "client@example.com",
    firstName: "Ada",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    responses: [],
    photoUrl: null,
    createdAt: "2026-04-28T12:00:00Z",
  }),
  claimReadingDeliveryAttempt: vi.fn(),
  claimReadingDeliveryAttemptBody: vi.fn(async (_id: string, _jti: string, fresh: unknown) => fresh),
  clearReadingDeliveryAttempt: vi.fn(),
  findSubmissionById: vi.fn(),
  markSubmissionDeliveredIfUnset: vi.fn(),
  recordReadingDeliverySent: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  fetchDeliverableSubmissions: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  renderReadingDelivery: vi.fn(async (_context: unknown, listenUrl: string) => ({
    subject: "Your reading",
    html: listenUrl,
  })),
  sendRenderedReadingDelivery: vi.fn(),
}));

vi.mock("@/lib/booking/emailFailures", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/emailFailures")>(
    "@/lib/booking/emailFailures",
  );
  return { ...actual, recordEmailFailure: vi.fn() };
});

import { verifyListenToken } from "@/lib/auth/listenToken";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import {
  claimReadingDeliveryAttempt,
  findSubmissionById,
  recordReadingDeliverySent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendRenderedReadingDelivery } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);
const mockClaimAttempt = vi.mocked(claimReadingDeliveryAttempt);
const mockSend = vi.mocked(sendRenderedReadingDelivery);
const mockRecordSent = vi.mocked(recordReadingDeliverySent);
const mockFindById = vi.mocked(findSubmissionById);

const NOW = new Date("2026-04-29T12:00:00Z");
const FORCE_URL = "http://localhost/api/cron/deliver-reading?force=sub_force";

const PAID_SUBMISSION: SubmissionRecord = {
  _id: "sub_force",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-27T12:00:00Z",
  paidAt: "2026-04-27T12:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_recipient_force",
};

const DELIVERABLE = {
  _id: "sub_force",
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockAuth.mockReset().mockReturnValue(true);
  mockFetchDeliverable.mockReset().mockResolvedValue([]);
  mockClaimAttempt.mockReset().mockImplementation(async (_id, fresh) => ({ ...fresh, body: null }));
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_d7" });
  mockRecordSent.mockReset().mockResolvedValue(undefined);
  mockFindById.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function callRoute(url = FORCE_URL): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request(url, { method: "POST" }));
}

describe("/api/cron/deliver-reading?force=<submissionId>", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);

    expect((await callRoute()).status).toBe(401);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("returns 500 before any work when AUTH_TOKEN_SECRET is missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");

    const res = await callRoute();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "AUTH_TOKEN_SECRET missing" });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("returns 400 and sends nothing without a force id", async () => {
    const res = await callRoute("http://localhost/api/cron/deliver-reading");

    expect(res.status).toBe(400);
    expect(mockFindById).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the named submission with both published files and records the attempt time", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);

    const body = await (await callRoute()).json();

    expect(body).toEqual({
      processed: 1,
      sent: 1,
      skipped: 0,
      awaitingAssets: 0,
      submissionId: "sub_force",
      outcome: "sent",
    });
    expect(mockFetchDeliverable).toHaveBeenCalledWith(["sub_force"]);
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_force",
      {
        deliveredAt: NOW.toISOString(),
        voiceNoteUrl: DELIVERABLE.voiceNoteUrl,
        pdfUrl: DELIVERABLE.pdfUrl,
      },
      "msg_d7",
    );
  });

  it("mints a reading_delivery listen token", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);

    await callRoute();

    const listenUrl = (mockSend.mock.calls[0]?.[1] as { html: string }).html;
    expect(listenUrl).toContain("/listen/sub_force?t=");
    const verified = await verifyListenToken({
      token: new URL(listenUrl).searchParams.get("t") ?? "",
      currentRecipientUserId: "user_recipient_force",
    });
    expect(verified).toMatchObject({ valid: true, mintSource: "reading_delivery" });
  });

  it("returns awaitingAssets=1 when the published submission lacks a file", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);

    const body = await (await callRoute()).json();

    expect(body).toEqual({
      processed: 1,
      sent: 0,
      skipped: 1,
      awaitingAssets: 1,
      submissionId: "sub_force",
      outcome: "awaitingAssets",
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("leaves deliveredAt unset when the forced send fails", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "internal_server_error", statusCode: 500 });

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ processed: 1, sent: 0, skipped: 1, outcome: "skipped" });
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("sends once across two force calls when the first records the reading delivery", async () => {
    const recorded: NonNullable<SubmissionRecord["emailsFired"]> = [];
    mockRecordSent.mockImplementation(async (_id, delivery, resendId) => {
      recorded.push({ type: "reading_delivery", sentAt: delivery.deliveredAt, resendId });
    });
    mockFindById.mockImplementation(async () => ({ ...PAID_SUBMISSION, emailsFired: [...recorded] }));
    mockFetchDeliverable.mockResolvedValue([DELIVERABLE]);

    const first = await (await callRoute()).json();
    const second = await (await callRoute()).json();

    expect(first).toMatchObject({ sent: 1 });
    expect(second).toMatchObject({ sent: 0, skipped: 1, outcome: "alreadySent" });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0]?.[2]?.idempotencyKey).toMatch(/^reading-delivery\/sub_force\/[0-9a-f-]{36}$/);
  });

  it("returns processed=0 when the submission does not exist in D1", async () => {
    const body = await (await callRoute()).json();

    expect(body).toEqual({
      processed: 0,
      sent: 0,
      skipped: 1,
      awaitingAssets: 0,
      submissionId: "sub_force",
      outcome: "notFound",
    });
    expect(mockFetchDeliverable).not.toHaveBeenCalled();
  });
});
