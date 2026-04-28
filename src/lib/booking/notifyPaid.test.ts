import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../resend", () => ({
  sendNotificationToJosephine: vi.fn(),
  sendClientConfirmation: vi.fn(),
}));

vi.mock("./submissions", () => ({
  markSubmissionPaid: vi.fn(),
  buildSubmissionContext: vi.fn().mockReturnValue({
    id: "sub_1",
    email: "client@example.com",
    readingName: "Soul Blueprint",
    readingPriceDisplay: "$179",
    responses: [],
    photoUrl: null,
    createdAt: "2026-04-28T12:00:00Z",
  }),
}));

import { sendClientConfirmation, sendNotificationToJosephine } from "../resend";
import { applyPaidEvent } from "./notifyPaid";
import { markSubmissionPaid, type SubmissionRecord } from "./submissions";

const mockMarkPaid = vi.mocked(markSubmissionPaid);
const mockJosephine = vi.mocked(sendNotificationToJosephine);
const mockClient = vi.mocked(sendClientConfirmation);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-28T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

beforeEach(() => {
  mockMarkPaid.mockReset().mockResolvedValue(undefined);
  mockJosephine.mockReset().mockResolvedValue(undefined);
  mockClient.mockReset().mockResolvedValue(undefined);
});

describe("applyPaidEvent", () => {
  it("returns alreadyApplied without side effects when stripeEventId matches", async () => {
    const result = await applyPaidEvent(
      { ...SUBMISSION, stripeEventId: "evt_1" },
      { stripeEventId: "evt_1", stripeSessionId: "cs_1", paidAt: "2026-04-28T12:00:00Z" },
    );

    expect(result).toBe("alreadyApplied");
    expect(mockMarkPaid).not.toHaveBeenCalled();
    expect(mockJosephine).not.toHaveBeenCalled();
    expect(mockClient).not.toHaveBeenCalled();
  });

  it("marks paid then fires both Resend emails", async () => {
    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledWith("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
    });
    expect(mockJosephine).toHaveBeenCalledOnce();
    expect(mockClient).toHaveBeenCalledOnce();
  });

  it("does not propagate Resend failures", async () => {
    mockJosephine.mockRejectedValueOnce(new Error("Resend down"));
    mockClient.mockRejectedValueOnce(new Error("Resend down"));

    const result = await applyPaidEvent(SUBMISSION, {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-28T12:00:00Z",
    });

    expect(result).toBe("applied");
    expect(mockMarkPaid).toHaveBeenCalledOnce();
  });
});
