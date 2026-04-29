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

vi.mock("@/lib/resend", () => ({
  sendDay7OverdueAlert: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  appendEmailFired,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7OverdueAlert } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockSend = vi.mocked(sendDay7OverdueAlert);
const mockAppend = vi.mocked(appendEmailFired);

const OVERDUE_SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-20T12:00:00Z",
  paidAt: "2026-04-20T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_alert" });
  mockAppend.mockReset().mockResolvedValue(undefined);
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/email-day-7", { method: "POST" }));
}

describe("/api/cron/email-day-7", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
  });

  it("queries with paidBefore cutoff and requireMissingDeliveredAt", async () => {
    mockAuth.mockReturnValueOnce(true);
    await callRoute();
    expect(mockList).toHaveBeenCalledWith("day7-overdue-alert", {
      paidBefore: expect.any(String),
      requireMissingDeliveredAt: true,
    });
  });

  it("sends overdue alert and appends emailsFired entry", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([OVERDUE_SUBMISSION]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, alerted: 1, skipped: 0 });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ type: "day7-overdue-alert" }),
    );
  });

  it("skips submission when deliveredAt becomes set between query and processing", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([{ ...OVERDUE_SUBMISSION, deliveredAt: "2026-04-29T00:00:00Z" }]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, alerted: 0, skipped: 1 });
    expect(mockSend).not.toHaveBeenCalled();
  });
});
