import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendReadingNowState } from "../../../studio/actions/sendReadingNowState";

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
  markSubmissionDeliveredIfUnset: vi.fn(),
  recordDay7Sent: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  fetchDeliverableSubmissions: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendDay7Delivery: vi.fn(),
}));

import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import {
  type EmailFiredEntry,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  recordDay7Sent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7Delivery } from "@/lib/resend";

import { deliverOne, deliverRequested } from "./deliverDay7";

const mockSend = vi.mocked(sendDay7Delivery);
const mockRecordSent = vi.mocked(recordDay7Sent);
const mockMarkDelivered = vi.mocked(markSubmissionDeliveredIfUnset);
const mockFindById = vi.mocked(findSubmissionById);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);

const BEFORE_SEND = new Date("2026-04-29T12:00:00Z");
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

const DAY7_ENTRY: EmailFiredEntry = {
  type: "day7",
  sentAt: "2026-04-29T12:05:00Z",
  resendId: "msg_d7",
};

function sendAtSentTime(result: Awaited<ReturnType<typeof sendDay7Delivery>>) {
  return async () => {
    vi.setSystemTime(SENT_AT);
    return result;
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(BEFORE_SEND);
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
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
});

describe("deliverOne", () => {
  it("returns alreadySent without touching D1 or Resend when emailsFired has day7", async () => {
    const outcome = await deliverOne({ ...PAID_SUBMISSION, emailsFired: [DAY7_ENTRY] }, DELIVERABLE);

    expect(outcome).toBe("alreadySent");
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends with the day7/<id> Resend key, then records deliveredAt as the send time", async () => {
    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("sent");
    expect(mockSend.mock.calls[0]?.[2]).toEqual({ idempotencyKey: "day7/sub_1" });
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

  it("writes D1 delivered_at only after a dry run, with no day7 entry", async () => {
    mockSend.mockImplementationOnce(sendAtSentTime({ kind: "dry_run" }));

    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("dryRun");
    expect(mockMarkDelivered).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: SENT_AT.toISOString() }),
    );
    expect(mockRecordSent).not.toHaveBeenCalled();
  });

  it.each([
    { kind: "failed", error: "Resend 500" },
    { kind: "skipped", reason: "no_api_key" },
  ] as const)("leaves deliveredAt unset when the send result is $kind", async (result) => {
    mockSend.mockResolvedValueOnce(result);

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("skipped");
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
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
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends once when the 6-hourly cron and the 5-minute cron read the same record", async () => {
    mockSend
      .mockResolvedValueOnce({ kind: "sent", resendId: "msg_d7" })
      .mockResolvedValueOnce({ kind: "failed", error: "invalid_idempotent_request" });

    const scheduled = await deliverOne(PAID_SUBMISSION, DELIVERABLE);
    const requested = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect([scheduled, requested]).toEqual(["sent", "skipped"]);
    expect(mockSend.mock.calls.map((call) => call[2])).toEqual([
      { idempotencyKey: "day7/sub_1" },
      { idempotencyKey: "day7/sub_1" },
    ]);
    expect(mockRecordSent).toHaveBeenCalledTimes(1);
    expect(mockMarkDelivered).not.toHaveBeenCalled();

    const recorded = mockRecordSent.mock.calls.map(
      ([, delivery, resendId]): EmailFiredEntry => ({
        type: "day7",
        sentAt: delivery.deliveredAt,
        resendId,
      }),
    );
    const studioState = sendReadingNowState({
      published: {
        status: "paid",
        voiceNote: { asset: { _ref: "file-voice" } },
        readingPdf: { asset: { _ref: "file-pdf" } },
        emailsFired: recorded,
        deliveryFailedAt: "2026-04-29T12:05:00Z",
      },
    });
    expect(studioState).toBe("sent");
  });
});

describe("deliverRequested", () => {
  it("returns notFound when D1 has no submission", async () => {
    expect(await deliverRequested("sub_missing")).toBe("notFound");
    expect(mockFetchDeliverable).not.toHaveBeenCalled();
  });

  it("returns awaitingAssets when Sanity has no requested document with both files", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);

    expect(await deliverRequested("sub_1")).toBe("awaitingAssets");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("delivers the requested submission and records deliveredAt after the send", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);

    expect(await deliverRequested("sub_1")).toBe("sent");
    expect(mockFetchDeliverable).toHaveBeenCalledWith(["sub_1"], "deliveryRequestedAt");
    expect(mockRecordSent).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ deliveredAt: SENT_AT.toISOString() }),
      "msg_d7",
    );
  });

  it("leaves deliveredAt unset when the requested send fails", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500" });

    expect(await deliverRequested("sub_1")).toBe("skipped");
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockRecordSent).not.toHaveBeenCalled();
  });
});
