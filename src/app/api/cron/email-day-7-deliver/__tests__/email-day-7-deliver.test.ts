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
}));

vi.mock("@/lib/listenToken", () => ({
  signListenToken: vi.fn().mockResolvedValue("c3ViXzE.deadbeef"),
}));

vi.mock("@/lib/resend", () => ({
  sendDay7Delivery: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  appendEmailFired,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { signListenToken } from "@/lib/listenToken";
import { sendDay7Delivery } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockSign = vi.mocked(signListenToken);
const mockSend = vi.mocked(sendDay7Delivery);
const mockAppend = vi.mocked(appendEmailFired);

const DELIVERED_SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://images.withjosephine.com/voice.m4a",
  pdfUrl: "https://images.withjosephine.com/reading.pdf",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
};

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockSign.mockReset().mockResolvedValue("c3ViXzE.deadbeef");
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

  it("queries listings with requireDeliveredAt and emailType day7", async () => {
    mockAuth.mockReturnValueOnce(true);
    await callRoute();
    expect(mockList).toHaveBeenCalledWith("day7", { requireDeliveredAt: true });
  });

  it("computes listening URL via signListenToken and fires delivery email", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([DELIVERED_SUBMISSION]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 1, skipped: 0 });
    expect(mockSign).toHaveBeenCalledWith("sub_1");
    const sendArgs = mockSend.mock.calls[0];
    expect(sendArgs?.[1]).toBe("https://withjosephine.com/listen/c3ViXzE.deadbeef");
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ type: "day7", resendId: "msg_d7" }),
    );
  });

  it("skips submissions where deliveredAt is null in case the query bypassed filter", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([{ ...DELIVERED_SUBMISSION, deliveredAt: undefined }]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1 });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
