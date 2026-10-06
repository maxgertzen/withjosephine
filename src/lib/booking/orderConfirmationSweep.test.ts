import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./submissions", () => ({
  listPaidSubmissionsForEmail: vi.fn(),
}));

vi.mock("./emailFailures", async () => {
  const actual = await vi.importActual<typeof import("./emailFailures")>("./emailFailures");
  return { ...actual, recordEmailFailure: vi.fn() };
});

vi.mock("../resend", () => ({
  isDryRunRecipient: vi.fn((email: string) => email.startsWith("sandbox")),
}));

import { recordEmailFailure } from "./emailFailures";
import {
  flagMissingOrderConfirmations,
  ORDER_CONFIRMATION_GRACE_MS,
  ORDER_CONFIRMATION_LOOKBACK_MS,
} from "./orderConfirmationSweep";
import { listPaidSubmissionsForEmail, type SubmissionRecord } from "./submissions";

const mockList = vi.mocked(listPaidSubmissionsForEmail);
const mockRecord = vi.mocked(recordEmailFailure);

const NOW_MS = Date.parse("2026-10-04T12:00:00.000Z");

function paid(id: string, email: string): SubmissionRecord {
  return {
    _id: id,
    status: "paid",
    email,
    responses: [],
    createdAt: "2026-10-04T09:00:00.000Z",
    paidAt: "2026-10-04T09:30:00.000Z",
    reading: null,
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: "user_1",
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockList.mockReset().mockResolvedValue([]);
  mockRecord.mockReset().mockResolvedValue(undefined);
});

describe("flagMissingOrderConfirmations", () => {
  it("looks from 7 days to 1 hour before now, skipping submissions already flagged", async () => {
    await flagMissingOrderConfirmations(NOW_MS);

    expect(mockList).toHaveBeenCalledWith("order_confirmation", {
      paidAfter: new Date(NOW_MS - ORDER_CONFIRMATION_LOOKBACK_MS).toISOString(),
      paidBefore: new Date(NOW_MS - ORDER_CONFIRMATION_GRACE_MS).toISOString(),
      withoutFailureOf: "order_confirmation",
    });
  });

  it("records unrecorded for real recipients and skips addresses that would dry-run", async () => {
    mockList.mockResolvedValueOnce([paid("sub_real", "ada@example.com"), paid("sub_test", "sandbox@x.com")]);

    expect(await flagMissingOrderConfirmations(NOW_MS)).toBe(1);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord).toHaveBeenCalledWith(
      "sub_real",
      expect.objectContaining({
        emailType: "order_confirmation",
        kind: "unrecorded",
        recipient: "ada@example.com",
        attemptedAt: "2026-10-04T09:30:00.000Z",
      }),
    );
  });
});
