import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  claimReadingDeliveryAttempt: vi.fn(),
  clearReadingDeliveryAttempt: vi.fn(),
  findSubmissionById: vi.fn(),
  markSubmissionDeliveredIfUnset: vi.fn(),
  recordReadingDeliverySent: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  fetchDeliverableSubmissions: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendReadingDelivery: vi.fn(),
}));

import { LISTEN_TOKEN_TTL_MS, verifyListenToken } from "@/lib/auth/listenToken";
import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import {
  claimReadingDeliveryAttempt,
  clearReadingDeliveryAttempt,
  type EmailFiredEntry,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  type ReadingDeliveryAttempt,
  recordReadingDeliverySent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendReadingDelivery } from "@/lib/resend";

import {
  ATTEMPT_RETRY_WINDOW_MS,
  deliverOne,
  deliverRequested,
  RECORD_TRIES,
} from "./readingDelivery";

const mockSend = vi.mocked(sendReadingDelivery);
const mockRecordSent = vi.mocked(recordReadingDeliverySent);
const mockMarkDelivered = vi.mocked(markSubmissionDeliveredIfUnset);
const mockClaimAttempt = vi.mocked(claimReadingDeliveryAttempt);
const mockClearAttempt = vi.mocked(clearReadingDeliveryAttempt);
const mockFindById = vi.mocked(findSubmissionById);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);

const ATTEMPT_AT = new Date("2026-04-29T12:00:00Z");
const SENT_AT = new Date("2026-04-29T12:00:07Z");

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

const DELIVERABLE = {
  _id: "sub_1",
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
};

const DELIVERY_ENTRY: EmailFiredEntry = {
  type: "reading_delivery",
  sentAt: "2026-04-29T12:05:00Z",
  resendId: "msg_d7",
};

const LEGACY_DELIVERY_ENTRY = { ...DELIVERY_ENTRY, type: "day7" } as unknown as EmailFiredEntry;

let storedAttempt: ReadingDeliveryAttempt | null;

function sendAtSentTime(result: Awaited<ReturnType<typeof sendReadingDelivery>>) {
  return async () => {
    vi.setSystemTime(SENT_AT);
    return result;
  };
}

function listenUrlOfSend(callIndex: number): string {
  return mockSend.mock.calls[callIndex]?.[1] as string;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(ATTEMPT_AT);
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  storedAttempt = null;
  mockClaimAttempt.mockReset().mockImplementation(async (_id, fresh) => {
    storedAttempt ??= fresh;
    return storedAttempt;
  });
  mockClearAttempt.mockReset().mockImplementation(async () => {
    storedAttempt = null;
  });
  mockSend
    .mockReset()
    .mockImplementation(sendAtSentTime({ kind: "sent", resendId: "msg_d7" }));
  mockRecordSent.mockReset().mockResolvedValue(undefined);
  mockMarkDelivered.mockReset().mockResolvedValue(undefined);
  mockFindById.mockReset().mockResolvedValue(null);
  mockFetchDeliverable.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("deliverOne", () => {
  it.each([
    ["reading_delivery", DELIVERY_ENTRY],
    ["legacy day7", LEGACY_DELIVERY_ENTRY],
  ])(
    "returns alreadySent without an attempt or a send when emailsFired has %s",
    async (_label, entry) => {
      const outcome = await deliverOne({ ...PAID_SUBMISSION, emailsFired: [entry] }, DELIVERABLE);

      expect(outcome).toBe("alreadySent");
      expect(mockClaimAttempt).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
      expect(mockRecordSent).not.toHaveBeenCalled();
    },
  );

  it("sends with the reading-delivery/<id> key and records deliveredAt as the attempt time", async () => {
    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("sent");
    expect(mockSend.mock.calls[0]?.[2]).toEqual({ idempotencyKey: "reading-delivery/sub_1" });
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_1",
      {
        deliveredAt: ATTEMPT_AT.toISOString(),
        voiceNoteUrl: DELIVERABLE.voiceNoteUrl,
        pdfUrl: DELIVERABLE.pdfUrl,
      },
      "msg_d7",
    );
    expect(mockMarkDelivered).not.toHaveBeenCalled();
  });

  it("mints the listen token from the stored attempt jti and time", async () => {
    await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    const token = new URL(listenUrlOfSend(0)).searchParams.get("t") ?? "";
    const verified = await verifyListenToken({
      token,
      currentRecipientUserId: "user_recipient_1",
    });
    expect(verified).toMatchObject({
      valid: true,
      jti: storedAttempt?.jti,
      expMs: ATTEMPT_AT.getTime() + LISTEN_TOKEN_TTL_MS,
    });
  });

  it("builds the identical email on a retry of the same attempt", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "internal_server_error", statusCode: 500 });
    await deliverOne(PAID_SUBMISSION, DELIVERABLE);
    vi.setSystemTime(new Date(ATTEMPT_AT.getTime() + 60 * 60 * 1000));
    await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(mockSend.mock.calls[1]).toEqual(mockSend.mock.calls[0]);
  });

  it("retries the D1 record inline and reports sent when a later try succeeds", async () => {
    mockRecordSent.mockRejectedValueOnce(new Error("D1_ERROR: network lost"));

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("sent");
    expect(mockRecordSent).toHaveBeenCalledTimes(2);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("sends once and records once when a retry follows a failed record", async () => {
    mockRecordSent.mockRejectedValue(new Error("D1_ERROR: network lost"));

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("retryLater");
    expect(mockRecordSent).toHaveBeenCalledTimes(RECORD_TRIES);
    expect(storedAttempt).not.toBeNull();

    mockRecordSent.mockReset().mockResolvedValue(undefined);
    vi.setSystemTime(new Date(ATTEMPT_AT.getTime() + 5 * 60 * 1000));
    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("sent");

    expect(mockSend.mock.calls[1]).toEqual(mockSend.mock.calls[0]);
    expect(mockRecordSent).toHaveBeenCalledTimes(1);
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: ATTEMPT_AT.toISOString() }),
      "msg_d7",
    );
  });

  it("keeps the attempt and asks for a later retry when Resend answers 409", async () => {
    mockSend.mockResolvedValueOnce({
      kind: "failed",
      error: "concurrent_idempotent_requests",
      statusCode: 409,
    });

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("retryLater");
    expect(storedAttempt).not.toBeNull();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("keeps the attempt and reports skipped when Resend says the key was used with another body", async () => {
    mockSend.mockResolvedValueOnce({
      kind: "failed",
      error: "invalid_idempotent_request",
      statusCode: 409,
    });

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("skipped");
    expect(storedAttempt).not.toBeNull();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("does not send and reports attemptExpired when the unrecorded attempt is past the retry window", async () => {
    storedAttempt = {
      attemptedAt: new Date(ATTEMPT_AT.getTime() - ATTEMPT_RETRY_WINDOW_MS - 1).toISOString(),
      jti: "old-attempt",
    };

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("attemptExpired");
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(storedAttempt).toBeNull();
  });

  it("starts a fresh attempt on the next request after an expired one", async () => {
    storedAttempt = {
      attemptedAt: new Date(ATTEMPT_AT.getTime() - ATTEMPT_RETRY_WINDOW_MS - 1).toISOString(),
      jti: "old-attempt",
    };
    await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("sent");
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(storedAttempt).toMatchObject({ attemptedAt: ATTEMPT_AT.toISOString() });
  });

  it("clears the attempt and writes D1 delivered_at only after a dry run", async () => {
    mockSend.mockImplementationOnce(sendAtSentTime({ kind: "dry_run" }));

    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("dryRun");
    expect(storedAttempt).toBeNull();
    expect(mockMarkDelivered).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: SENT_AT.toISOString() }),
    );
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "failed", error: "validation_error", statusCode: 422 },
    { kind: "skipped", reason: "no_api_key" },
  ] as const)("clears the attempt when Resend refused before sending ($kind)", async (result) => {
    mockSend.mockResolvedValueOnce(result);

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("skipped");
    expect(storedAttempt).toBeNull();
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(mockMarkDelivered).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "failed", error: "internal_server_error", statusCode: 500 },
    { kind: "failed", error: "application_error", statusCode: null },
  ] as const)("keeps the attempt when the send outcome is unknown ($statusCode)", async (result) => {
    mockSend.mockResolvedValueOnce(result);

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("skipped");
    expect(storedAttempt).not.toBeNull();
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(mockMarkDelivered).not.toHaveBeenCalled();
  });

  it("leaves deliveredAt unset when the send throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("network down"));

    await expect(deliverOne(PAID_SUBMISSION, DELIVERABLE)).rejects.toThrow("network down");
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it("returns skipped for a submission that is not paid", async () => {
    const outcome = await deliverOne({ ...PAID_SUBMISSION, status: "pending" }, DELIVERABLE);

    expect(outcome).toBe("skipped");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns skipped for a legacy gift row without sending", async () => {
    const outcome = await deliverOne({ ...PAID_SUBMISSION, isLegacyGift: true }, DELIVERABLE);

    expect(outcome).toBe("skipped");
    expect(mockClaimAttempt).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends the same request twice when the 6-hourly and 5-minute runs read the same record", async () => {
    const scheduled = await deliverOne(PAID_SUBMISSION, DELIVERABLE);
    const requested = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect([scheduled, requested]).toEqual(["sent", "sent"]);
    expect(mockSend.mock.calls[1]).toEqual(mockSend.mock.calls[0]);
    expect(mockSend.mock.calls[0]?.[2]).toEqual({ idempotencyKey: "reading-delivery/sub_1" });
  });
});

describe("deliverRequested", () => {
  it("returns notFound when D1 has no submission", async () => {
    expect(await deliverRequested("sub_missing")).toBe("notFound");
    expect(mockFetchDeliverable).not.toHaveBeenCalled();
  });

  it("returns awaitingAssets when Sanity has no published document with both files", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);

    expect(await deliverRequested("sub_1")).toBe("awaitingAssets");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("delivers the requested submission and records deliveredAt as the attempt time", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);

    expect(await deliverRequested("sub_1")).toBe("sent");
    expect(mockFetchDeliverable).toHaveBeenCalledWith(["sub_1"]);
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: ATTEMPT_AT.toISOString() }),
      "msg_d7",
    );
  });
});
