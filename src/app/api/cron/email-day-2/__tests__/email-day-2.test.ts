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
  sendDay2Started: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  appendEmailFired,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay2Started } from "@/lib/resend";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockSend = vi.mocked(sendDay2Started);
const mockAppend = vi.mocked(appendEmailFired);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  paidAt: "2026-04-25T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
};

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockSend.mockReset().mockResolvedValue({ resendId: "msg_d2" });
  mockAppend.mockReset().mockResolvedValue(undefined);
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/email-day-2", { method: "POST" }));
}

describe("/api/cron/email-day-2", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("queries with paidBefore cutoff filtering out emailsFired day2", async () => {
    mockAuth.mockReturnValueOnce(true);
    await callRoute();
    expect(mockList).toHaveBeenCalledWith("day2", {
      paidBefore: expect.any(String),
    });
  });

  it("sends day2 email and appends emailsFired entry per candidate", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([SUBMISSION]);
    const res = await callRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 1, skipped: 0 });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ type: "day2", resendId: "msg_d2" }),
    );
  });

  it("skips submissions whose status changed off paid", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([{ ...SUBMISSION, status: "expired" }]);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1 });
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("does not append emailsFired when send returns null resendId", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([SUBMISSION]);
    mockSend.mockResolvedValueOnce({ resendId: null });
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 1, sent: 0, skipped: 1 });
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("isolates per-row failures and continues processing the batch", async () => {
    mockAuth.mockReturnValueOnce(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockList.mockResolvedValueOnce([SUBMISSION, { ...SUBMISSION, _id: "sub_2" }]);
    mockSend.mockRejectedValueOnce(new Error("Resend down")).mockResolvedValueOnce({
      resendId: "msg_d2_b",
    });
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ processed: 2, sent: 1, skipped: 1 });
  });
});
