import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));

vi.mock("@/lib/booking/notifyPaid", () => ({
  applyPaidEvent: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  listRecentCompletedCheckoutSessions: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import { listRecentCompletedCheckoutSessions } from "@/lib/stripe";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listRecentCompletedCheckoutSessions);
const mockFind = vi.mocked(findSubmissionById);
const mockApply = vi.mocked(applyPaidEvent);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockFind.mockReset();
  mockApply.mockReset().mockResolvedValue("applied");
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/reconcile", { method: "POST" }));
}

describe("/api/cron/reconcile", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("returns summary with zero reconciled when no sessions", async () => {
    mockAuth.mockReturnValueOnce(true);
    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ checked: 0, reconciled: 0 });
  });

  it("applies paid event for each session matching a submission", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: "sub_1", created: 1714291200 },
      { id: "cs_2", client_reference_id: "sub_2", created: 1714291300 },
    ] as never);
    mockFind.mockResolvedValueOnce(SUBMISSION).mockResolvedValueOnce({
      ...SUBMISSION,
      _id: "sub_2",
    });

    const res = await callRoute();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ checked: 2, reconciled: 2 });
    expect(mockApply).toHaveBeenCalledTimes(2);
    expect(mockApply.mock.calls[0][1]).toEqual({
      stripeEventId: "reconcile:cs_1",
      stripeSessionId: "cs_1",
      paidAt: "2024-04-28T08:00:00.000Z",
    });
  });

  it("skips sessions with no client_reference_id", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: null, created: 1714291200 },
    ] as never);

    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ checked: 1, reconciled: 0 });
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("skips when submission missing", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: "sub_missing", created: 1714291200 },
    ] as never);
    mockFind.mockResolvedValueOnce(null);

    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ checked: 1, reconciled: 0 });
    expect(mockApply).not.toHaveBeenCalled();
  });

  it("does not count alreadyApplied as reconciled", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: "sub_1", created: 1714291200 },
    ] as never);
    mockFind.mockResolvedValueOnce(SUBMISSION);
    mockApply.mockResolvedValueOnce("alreadyApplied");

    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ checked: 1, reconciled: 0 });
  });
});
