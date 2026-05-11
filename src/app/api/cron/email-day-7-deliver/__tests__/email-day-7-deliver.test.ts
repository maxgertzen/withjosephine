import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

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
  listPaidSubmissionsForEmail: vi.fn(),
  markSubmissionDelivered: vi.fn(),
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
  appendEmailFired,
  listPaidSubmissionsForEmail,
  markSubmissionDelivered,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7Delivery } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockFetchDeliverable = vi.mocked(fetchDeliverableSubmissions);
const mockMarkDelivered = vi.mocked(markSubmissionDelivered);
const mockSend = vi.mocked(sendDay7Delivery);
const mockAppend = vi.mocked(appendEmailFired);

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
  recipientUserId: null,};

const DELIVERABLE = {
  _id: "sub_1",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
};

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockFetchDeliverable.mockReset().mockResolvedValue([]);
  mockMarkDelivered.mockReset().mockResolvedValue(undefined);
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_d7" });
  mockAppend.mockReset().mockResolvedValue(undefined);
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/email-day-7-deliver", { method: "POST" }));
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
    expect(mockMarkDelivered).toHaveBeenCalledWith("sub_1", {
      deliveredAt: DELIVERABLE.deliveredAt,
      voiceNoteUrl: DELIVERABLE.voiceNoteUrl,
      pdfUrl: DELIVERABLE.pdfUrl,
    });
    const sendArgs = mockSend.mock.calls[0];
    expect(sendArgs?.[1]).toBe("https://withjosephine.com/listen/sub_1");
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ type: "day7", resendId: "msg_d7" }),
    );
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
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("skips when Resend returns no resendId (does not append emailsFired)", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([PAID_SUBMISSION]);
    mockFetchDeliverable.mockResolvedValueOnce([DELIVERABLE]);
    mockSend.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1, awaitingAssets: 0 });
    expect(mockMarkDelivered).toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });
});
