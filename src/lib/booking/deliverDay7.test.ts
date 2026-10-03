import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendReadingNowState } from "../../../studio/actions/sendReadingNowState";

vi.mock("@/lib/booking/submissions", () => ({
  appendEmailFired: vi.fn(),
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
  markSubmissionDelivered: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  fetchDeliverableSubmissions: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendDay7Delivery: vi.fn(),
}));

import { fetchDeliverableSubmissions } from "@/lib/booking/persistence/sanityDelivery";
import {
  appendEmailFired,
  type EmailFiredEntry,
  findSubmissionById,
  markSubmissionDelivered,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7Delivery } from "@/lib/resend";

import { deliverById, deliverOne } from "./deliverDay7";

const mockSend = vi.mocked(sendDay7Delivery);
const mockAppend = vi.mocked(appendEmailFired);
const mockMarkDelivered = vi.mocked(markSubmissionDelivered);
const mockFindById = vi.mocked(findSubmissionById);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);

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
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
};

const DAY7_ENTRY: EmailFiredEntry = {
  type: "day7",
  sentAt: "2026-04-29T12:05:00Z",
  resendId: "msg_d7",
};

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_d7" });
  mockAppend.mockReset().mockResolvedValue(undefined);
  mockMarkDelivered.mockReset().mockResolvedValue(undefined);
  mockFindById.mockReset().mockResolvedValue(null);
  mockFetchDeliverable.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("deliverOne", () => {
  it("returns alreadySent without touching D1 or Resend when emailsFired has day7", async () => {
    const outcome = await deliverOne({ ...PAID_SUBMISSION, emailsFired: [DAY7_ENTRY] }, DELIVERABLE);

    expect(outcome).toBe("alreadySent");
    expect(mockMarkDelivered).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends with the day7/<id> Resend key and records the email", async () => {
    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("sent");
    expect(mockSend.mock.calls[0]?.[2]).toEqual({ idempotencyKey: "day7/sub_1" });
    expect(mockAppend).toHaveBeenCalledWith("sub_1", expect.objectContaining({ type: "day7" }));
  });

  it("returns dryRun when the send is a dry run", async () => {
    mockSend.mockResolvedValueOnce({ kind: "dry_run" });

    const outcome = await deliverOne(PAID_SUBMISSION, DELIVERABLE);

    expect(outcome).toBe("dryRun");
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("returns skipped when the send fails", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "Resend 500" });

    expect(await deliverOne(PAID_SUBMISSION, DELIVERABLE)).toBe("skipped");
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
    expect(mockAppend).toHaveBeenCalledTimes(1);

    const recorded = mockAppend.mock.calls.map(([, entry]) => entry);
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

describe("deliverById", () => {
  it("returns notFound when D1 has no submission", async () => {
    expect(await deliverById("sub_missing")).toBe("notFound");
    expect(mockFetchDeliverable).not.toHaveBeenCalled();
  });

  it("returns awaitingAssets when Sanity has no deliverable document", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);

    expect(await deliverById("sub_1")).toBe("awaitingAssets");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("delivers the named submission", async () => {
    mockFindById.mockResolvedValueOnce(PAID_SUBMISSION);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);

    expect(await deliverById("sub_1")).toBe("sent");
    expect(mockFetchDeliverable).toHaveBeenCalledWith(["sub_1"]);
  });
});
