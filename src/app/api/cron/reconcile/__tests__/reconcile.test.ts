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

vi.mock("@/lib/booking/duplicatePayment", () => ({
  refundDuplicatePayment: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { refundDuplicatePayment } from "@/lib/booking/duplicatePayment";
import { applyPaidEvent } from "@/lib/booking/notifyPaid";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import { listRecentCompletedCheckoutSessions } from "@/lib/stripe";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listRecentCompletedCheckoutSessions);
const mockFind = vi.mocked(findSubmissionById);
const mockApply = vi.mocked(applyPaidEvent);
const mockRefund = vi.mocked(refundDuplicatePayment);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: null,
  };

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockFind.mockReset();
  mockApply.mockReset().mockResolvedValue("applied");
  mockRefund.mockReset().mockResolvedValue(true);
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
    expect(body).toEqual({ checked: 0, reconciled: 0, refunded: 0 });
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
    expect(body).toEqual({ checked: 2, reconciled: 2, refunded: 0 });
    expect(mockApply).toHaveBeenCalledTimes(2);
    expect(mockApply.mock.calls[0][1]).toEqual({
      stripeEventId: "reconcile:cs_1",
      stripeSessionId: "cs_1",
      paidAt: "2024-04-28T08:00:00.000Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
  });

  it("skips sessions with no client_reference_id", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: null, created: 1714291200 },
    ] as never);

    const res = await callRoute();
    const body = await res.json();
    expect(body).toEqual({ checked: 1, reconciled: 0, refunded: 0 });
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
    expect(body).toEqual({ checked: 1, reconciled: 0, refunded: 0 });
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
    expect(body).toEqual({ checked: 1, reconciled: 0, refunded: 0 });
  });

  it("refunds duplicate sessions and counts only fresh refunds", async () => {
    mockAuth.mockReturnValueOnce(true);
    const sessions = [
      { id: "cs_2", client_reference_id: "sub_1", created: 1714291200 },
      { id: "cs_3", client_reference_id: "sub_1", created: 1714291300 },
    ];
    mockList.mockResolvedValueOnce(sessions as never);
    mockFind.mockResolvedValue({ ...SUBMISSION, status: "paid", stripeSessionId: "cs_1" });
    mockApply.mockResolvedValue("duplicate");
    mockRefund.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const res = await callRoute();

    expect(await res.json()).toEqual({ checked: 2, reconciled: 0, refunded: 1 });
    expect(mockRefund).toHaveBeenCalledTimes(2);
    expect(mockRefund).toHaveBeenNthCalledWith(1, sessions[0]);
  });

  it("reports a failing booking session and keeps reconciling the next one", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: "sub_1", created: 1714291200 },
      { id: "cs_2", client_reference_id: "sub_2", created: 1714291300 },
    ] as never);
    mockFind.mockResolvedValue(SUBMISSION);
    mockApply.mockRejectedValueOnce(new Error("D1 down")).mockResolvedValueOnce("applied");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await callRoute();

    expect(await res.json()).toEqual({ checked: 2, reconciled: 1, refunded: 0 });
    expect(consoleError).toHaveBeenCalledWith(
      "[cron-reconcile] submission sub_1 reconcile failed (Error), next run retries",
    );
    consoleError.mockRestore();
  });

  it("does not refund applied or alreadyApplied sessions", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList.mockResolvedValueOnce([
      { id: "cs_1", client_reference_id: "sub_1", created: 1714291200 },
      { id: "cs_1", client_reference_id: "sub_1", created: 1714291200 },
    ] as never);
    mockFind.mockResolvedValue(SUBMISSION);
    mockApply.mockResolvedValueOnce("applied").mockResolvedValueOnce("alreadyApplied");

    await callRoute();

    expect(mockRefund).not.toHaveBeenCalled();
  });
});
