import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../resend", () => ({
  sendNotificationToJosephine: vi.fn(),
  sendOrderConfirmation: vi.fn(),
}));

vi.mock("./submissions", () => ({
  markSubmissionPaid: vi.fn(),
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
}));

import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import { applyPaidEvent } from "./notifyPaid";
import { appendEmailFired, markSubmissionPaid, type SubmissionRecord } from "./submissions";

const mockMarkPaid = vi.mocked(markSubmissionPaid);
const mockJosephine = vi.mocked(sendNotificationToJosephine);
const mockOrderConfirmation = vi.mocked(sendOrderConfirmation);
const mockAppendEmailFired = vi.mocked(appendEmailFired);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
};

beforeEach(() => {
  mockMarkPaid.mockReset().mockResolvedValue(undefined);
  mockJosephine.mockReset().mockResolvedValue({ resendId: "msg_j" });
  mockOrderConfirmation.mockReset().mockResolvedValue({ resendId: "msg_oc" });
  mockAppendEmailFired.mockReset().mockResolvedValue(undefined);
});

describe("applyPaidEvent", () => {
  it("returns alreadyApplied without side effects when stripeEventId matches", async () => {
    const result = await applyPaidEvent(
      { ...SUBMISSION, stripeEventId: "evt_1" },
      {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
        amountPaidCents: null,
        amountPaidCurrency: null,
      },
    );

    expect(result).toBe("alreadyApplied");
    expect(mockMarkPaid).not.toHaveBeenCalled();
    expect(mockJosephine).not.toHaveBeenCalled();
    expect(mockOrderConfirmation).not.toHaveBeenCalled();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("marks paid, fires both Resend emails, and writes order_confirmation to emailsFired", async () => {
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledWith("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockOrderConfirmation).toHaveBeenCalledOnce();
    expect(mockAppendEmailFired).toHaveBeenCalledOnce();
    const entry = mockAppendEmailFired.mock.calls[0]?.[1];
    expect(entry?.type).toBe("order_confirmation");
    expect(entry?.resendId).toBe("msg_oc");
  });

  it("does not append emailsFired when order confirmation returns null resendId", async () => {
    mockOrderConfirmation.mockResolvedValueOnce({ resendId: null });
    await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("does not propagate Resend failures", async () => {
    mockJosephine.mockRejectedValueOnce(new Error("Resend down"));
    mockOrderConfirmation.mockRejectedValueOnce(new Error("Resend down"));

    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledOnce();
    expect(mockAppendEmailFired).not.toHaveBeenCalled();
  });

  it("swallows emailsFired write failures without throwing", async () => {
    mockAppendEmailFired.mockRejectedValueOnce(new Error("Sanity down"));
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
      amountPaidCents: null,
      amountPaidCurrency: null,
    });
    expect(result).toBe("applied");
  });
});
