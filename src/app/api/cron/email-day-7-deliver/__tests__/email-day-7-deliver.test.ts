import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  buildSubmissionContext: vi.fn().mockReturnValue({
    id: "sub_1",
    email: "client@example.com",
    firstName: "Ada",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    responses: [],
    photoUrl: null,
    createdAt: "2026-04-28T12:00:00Z",
  }),
  findSubmissionById: vi.fn(),
  listPaidSubmissionsForEmail: vi.fn(),
  markSubmissionDeliveredIfUnset: vi.fn(),
  recordDay7Sent: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  fetchDeliverableSubmissions: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendDay7Delivery: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import {
  findSubmissionById,
  listPaidSubmissionsForEmail,
  markSubmissionDeliveredIfUnset,
  recordDay7Sent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7Delivery } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);
const mockMarkDelivered = vi.mocked(markSubmissionDeliveredIfUnset);
const mockSend = vi.mocked(sendDay7Delivery);
const mockRecordSent = vi.mocked(recordDay7Sent);
const mockFindById = vi.mocked(findSubmissionById);

const PAID_SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_recipient_1",
};

const SENT_AT = new Date("2026-04-29T12:00:07Z");

function sendAtSentTime(result: Awaited<ReturnType<typeof sendDay7Delivery>>) {
  return async () => {
    vi.setSystemTime(SENT_AT);
    return result;
  };
}

const DELIVERABLE = {
  _id: "sub_1",
  voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-04-29T12:00:00Z"));
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockFetchDeliverable.mockReset().mockResolvedValue([]);
  mockMarkDelivered.mockReset().mockResolvedValue(undefined);
  mockSend.mockReset().mockImplementation(sendAtSentTime({ kind: "sent", resendId: "msg_d7" }));
  mockRecordSent.mockReset().mockResolvedValue(undefined);
  mockFindById.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const TOKEN_URL_PATTERN = /^https?:\/\/[^/]+\/listen\/[^?]+\?t=[A-Za-z0-9_.-]+$/;

async function callRoute(url = "http://localhost/api/cron/email-day-7-deliver"): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request(url, { method: "POST" }));
}

describe("/api/cron/email-day-7-deliver", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("queries D1 candidates with day7 emailType and no delivery filters", async () => {
    mockAuth.mockReturnValueOnce(true);
    await callRoute();
    expect(mockList).toHaveBeenCalledWith("day7", {});
  });

  it("skips when no candidates exist (no Sanity round-trip)", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 0, sent: 0, skipped: 0, awaitingAssets: 0 });
    expect(mockFetchDeliverable).not.toHaveBeenCalled();
  });

  it("delivers candidates that Sanity reports deliverable", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 1, skipped: 0, awaitingAssets: 0 });
    const sendArgs = mockSend.mock.calls[0];
    const listenUrl = sendArgs?.[1] as string;
    expect(listenUrl).toMatch(TOKEN_URL_PATTERN);
    expect(listenUrl).toContain("/listen/sub_1?t=");
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_1",
      {
        deliveredAt: SENT_AT.toISOString(),
        voiceNoteUrl: DELIVERABLE.voiceNoteUrl,
        pdfUrl: DELIVERABLE.pdfUrl,
      },
      "msg_d7",
    );
    expect(mockMarkDelivered).not.toHaveBeenCalled();
  });

  it("counts candidates Sanity reports as awaiting assets and does not deliver them", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1, awaitingAssets: 1 });
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("leaves deliveredAt unset and records no day7 entry when the send fails", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "test stub failure" });
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1, awaitingAssets: 0 });
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("writes D1 delivered_at after a dry run and counts it as skipped", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    mockSend.mockImplementationOnce(sendAtSentTime({ kind: "dry_run" }));
    const body = await (await callRoute()).json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1, awaitingAssets: 0 });
    expect(mockMarkDelivered).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: SENT_AT.toISOString() }),
    );
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  describe("?force=<submissionId> single-submission mode", () => {
    const FORCE_URL =
      "http://localhost/api/cron/email-day-7-deliver?force=sub_force";

    it("returns 401 when unauthorized (force-mode uses the same auth gate)", async () => {
      mockAuth.mockReturnValueOnce(false);
      const res = await callRoute(FORCE_URL);
      expect(res.status).toBe(401);
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it("bypasses listPaidSubmissionsForEmail and reads the named submission directly", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockFindById.mockResolvedValueOnce({ ...PAID_SUBMISSION, _id: "sub_force" });
      mockFetchDeliverable.mockResolvedValueOnce([{ ...DELIVERABLE, _id: "sub_force" }]);
      const res = await callRoute(FORCE_URL);
      const body = await res.json();
      expect(body).toEqual({
        processed: 1,
        sent: 1,
        skipped: 0,
        awaitingAssets: 0,
        submissionId: "sub_force",
      });
      expect(mockList).not.toHaveBeenCalled();
      expect(mockFindById).toHaveBeenCalledWith("sub_force");
      expect(mockFetchDeliverable).toHaveBeenCalledWith(["sub_force"], "deliveredAt");
      expect(mockRecordSent).toHaveBeenCalledWith(
        "sub_force",
        expect.objectContaining({ deliveredAt: SENT_AT.toISOString() }),
        "msg_d7",
      );
    });

    it("returns awaitingAssets=1 when the submission lacks Sanity assets", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockFindById.mockResolvedValueOnce({ ...PAID_SUBMISSION, _id: "sub_force" });
      mockFetchDeliverable.mockResolvedValueOnce([]);
      const res = await callRoute(FORCE_URL);
      const body = await res.json();
      expect(body).toEqual({
        processed: 1,
        sent: 0,
        skipped: 1,
        awaitingAssets: 1,
        submissionId: "sub_force",
      });
      expect(mockMarkDelivered).not.toHaveBeenCalled();
      expect(mockRecordSent).not.toHaveBeenCalled();
    });

    it("leaves deliveredAt unset when the forced send fails", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockFindById.mockResolvedValueOnce({ ...PAID_SUBMISSION, _id: "sub_force" });
      mockFetchDeliverable.mockResolvedValueOnce([{ ...DELIVERABLE, _id: "sub_force" }]);
      mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500" });
      const body = await (await callRoute(FORCE_URL)).json();
      expect(body).toMatchObject({ processed: 1, sent: 0, skipped: 1 });
      expect(mockMarkDelivered).not.toHaveBeenCalled();
      expect(mockRecordSent).not.toHaveBeenCalled();
    });

    it("sends once across two force calls when the first records day7", async () => {
      const recorded: NonNullable<SubmissionRecord["emailsFired"]> = [];
      mockRecordSent.mockImplementation(async (_id, delivery, resendId) => {
        recorded.push({ type: "day7", sentAt: delivery.deliveredAt, resendId });
      });
      mockFindById.mockImplementation(async () => ({
        ...PAID_SUBMISSION,
        _id: "sub_force",
        emailsFired: [...recorded],
      }));
      mockFetchDeliverable.mockResolvedValue([{ ...DELIVERABLE, _id: "sub_force" }]);
      mockAuth.mockReturnValue(true);

      const first = await (await callRoute(FORCE_URL)).json();
      const second = await (await callRoute(FORCE_URL)).json();

      expect(first).toMatchObject({ processed: 1, sent: 1, skipped: 0 });
      expect(second).toEqual({
        processed: 1,
        sent: 0,
        skipped: 1,
        awaitingAssets: 0,
        submissionId: "sub_force",
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockRecordSent).toHaveBeenCalledTimes(1);
      expect(mockSend.mock.calls[0]?.[2]).toEqual({ idempotencyKey: "day7/sub_force" });
    });

    it("returns processed=0 when the submission does not exist in D1", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockFindById.mockResolvedValueOnce(null);
      const res = await callRoute(FORCE_URL);
      const body = await res.json();
      expect(body).toEqual({
        processed: 0,
        sent: 0,
        skipped: 1,
        awaitingAssets: 0,
        submissionId: "sub_force",
      });
      expect(mockFetchDeliverable).not.toHaveBeenCalled();
    });
  });

  it("default sweep path is unchanged when no ?force query param is present", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    const res = await callRoute();
    const body = await res.json();
    // Default path returns the original sweep summary shape (no submissionId
    // field). Force-mode is the ONLY branch that adds that field.
    expect(body).toEqual({ processed: 1, sent: 1, skipped: 0, awaitingAssets: 0 });
    expect(mockFindById).not.toHaveBeenCalled();
  });

  describe("listen-token wiring (Phase 1 one-tap)", () => {
    it("mints a token-bearing URL in cron path with mintSource=cron_day7", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
      mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
      await callRoute();
      const listenUrl = mockSend.mock.calls[0]?.[1] as string;
      expect(listenUrl).toMatch(TOKEN_URL_PATTERN);
      const token = new URL(listenUrl).searchParams.get("t") ?? "";
      const { verifyListenToken } = await import("@/lib/auth/listenToken");
      const verified = await verifyListenToken({
        token,
        currentRecipientUserId: "user_recipient_1",
      });
      expect(verified.valid).toBe(true);
      if (verified.valid) {
        expect(verified.mintSource).toBe("cron_day7");
        expect(verified.submissionId).toBe("sub_1");
      }
    });

    it("mints a token-bearing URL in force path with mintSource=cron_day7", async () => {
      mockAuth.mockReturnValueOnce(true);
      mockFindById.mockResolvedValueOnce({
        ...PAID_SUBMISSION,
        _id: "sub_force",
        recipientUserId: "user_recipient_force",
      });
      mockFetchDeliverable.mockResolvedValueOnce([{ ...DELIVERABLE, _id: "sub_force" }]);
      await callRoute("http://localhost/api/cron/email-day-7-deliver?force=sub_force");
      const listenUrl = mockSend.mock.calls[0]?.[1] as string;
      expect(listenUrl).toMatch(TOKEN_URL_PATTERN);
      expect(listenUrl).toContain("/listen/sub_force?t=");
      const token = new URL(listenUrl).searchParams.get("t") ?? "";
      const { verifyListenToken } = await import("@/lib/auth/listenToken");
      const verified = await verifyListenToken({
        token,
        currentRecipientUserId: "user_recipient_force",
      });
      expect(verified.valid).toBe(true);
      if (verified.valid) {
        expect(verified.mintSource).toBe("cron_day7");
      }
    });

    it("returns 500 pre-flight when AUTH_TOKEN_SECRET is missing", async () => {
      vi.stubEnv("AUTH_TOKEN_SECRET", "");
      mockAuth.mockReturnValueOnce(true);
      const res = await callRoute();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: "AUTH_TOKEN_SECRET missing" });
      // Pre-flight runs before any work: candidate query never happens.
      expect(mockList).not.toHaveBeenCalled();
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it("returns 500 pre-flight in force mode when AUTH_TOKEN_SECRET is missing", async () => {
      vi.stubEnv("AUTH_TOKEN_SECRET", "");
      mockAuth.mockReturnValueOnce(true);
      const res = await callRoute("http://localhost/api/cron/email-day-7-deliver?force=sub_x");
      expect(res.status).toBe(500);
      expect(mockFindById).not.toHaveBeenCalled();
    });

    it("skips submissions with null recipientUserId without crashing the sweep", async () => {
      mockAuth.mockReturnValueOnce(true);
      const orphan: SubmissionRecord = { ...PAID_SUBMISSION, _id: "sub_orphan", recipientUserId: null };
      mockList.mockResolvedValueOnce([orphan, PAID_SUBMISSION]);
      mockFetchDeliverable.mockResolvedValueOnce([
        { ...DELIVERABLE, _id: "sub_orphan" },
        DELIVERABLE,
      ]);
      const res = await callRoute();
      const body = await res.json();
      expect(body).toEqual({ processed: 2, sent: 1, skipped: 1, awaitingAssets: 0 });
      // The orphan submission must never be sent: only one send call landed.
      expect(mockSend).toHaveBeenCalledTimes(1);
      const listenUrl = mockSend.mock.calls[0]?.[1] as string;
      expect(listenUrl).toContain("/listen/sub_1?t=");
    });
  });
});
