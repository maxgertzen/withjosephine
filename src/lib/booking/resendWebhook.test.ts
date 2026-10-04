import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./submissions", () => ({
  findSubmissionById: vi.fn(),
  findSubmissionByResendId: vi.fn(),
}));

vi.mock("./emailFailures", async () => {
  const actual = await vi.importActual<typeof import("./emailFailures")>("./emailFailures");
  return { ...actual, recordEmailFailure: vi.fn() };
});

vi.mock("../resend", () => ({
  CUSTOMER_EMAIL_TAG: { submissionId: "submission_id", emailType: "email_type" },
}));

import type { WebhookEventPayload } from "resend";

import { recordEmailFailure } from "./emailFailures";
import { handleResendWebhookEvent } from "./resendWebhook";
import { findSubmissionById, findSubmissionByResendId, type SubmissionRecord } from "./submissions";

const mockFindById = vi.mocked(findSubmissionById);
const mockFindByResendId = vi.mocked(findSubmissionByResendId);
const mockRecord = vi.mocked(recordEmailFailure);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "ada@exmaple.com",
  responses: [],
  createdAt: "2026-10-01T00:00:00.000Z",
  reading: null,
  amountPaidCents: 17900,
  amountPaidCurrency: "usd",
  recipientUserId: "user_1",
  emailsFired: [{ type: "reading_delivery", sentAt: "2026-10-04T12:00:00.000Z", resendId: "msg_1" }],
  emailFailures: [],
};

const BASE_DATA = {
  created_at: "2026-10-04T12:00:00.000Z",
  email_id: "msg_1",
  from: "Josephine <hello@withjosephine.com>",
  to: ["ada@exmaple.com"],
  subject: "Your reading",
  tags: { submission_id: "sub_1", email_type: "reading_delivery" },
};

function event(type: string, extra: Record<string, unknown> = {}, data = BASE_DATA) {
  return {
    type,
    created_at: "2026-10-04T12:00:05.000Z",
    data: { ...data, ...extra },
  } as unknown as WebhookEventPayload;
}

const BOUNCED = event("email.bounced", {
  bounce: { type: "Permanent", subType: "General", message: "Mailbox does not exist" },
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockFindById.mockReset().mockResolvedValue(SUBMISSION);
  mockFindByResendId.mockReset().mockResolvedValue(SUBMISSION);
  mockRecord.mockReset().mockResolvedValue(undefined);
});

describe("handleResendWebhookEvent", () => {
  it("records a bounce with its type, message and Resend id", async () => {
    expect(await handleResendWebhookEvent(BOUNCED)).toBe("recorded");

    expect(mockFindById).toHaveBeenCalledWith("sub_1");
    expect(mockRecord).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({
        emailType: "reading_delivery",
        kind: "bounced",
        recipient: "ada@exmaple.com",
        bounceType: "Permanent / General",
        errorMessage: "Mailbox does not exist",
        resendId: "msg_1",
        attemptedAt: "2026-10-04T12:00:00.000Z",
        failedAt: "2026-10-04T12:00:05.000Z",
      }),
    );
  });

  it.each([
    ["email.complained", {}, "complained", null],
    ["email.suppressed", { suppressed: { type: "bounce", message: "On suppression list" } }, "suppressed", "On suppression list"],
    ["email.failed", { failed: { reason: "reached_daily_quota" } }, "send_error", "reached_daily_quota"],
  ] as const)("records %s as %s", async (type, extra, kind, errorMessage) => {
    await handleResendWebhookEvent(event(type, extra));

    expect(mockRecord).toHaveBeenCalledWith("sub_1", expect.objectContaining({ kind, errorMessage }));
  });

  it("finds an untagged email by its Resend id", async () => {
    const untagged = { ...BASE_DATA, tags: undefined } as unknown as typeof BASE_DATA;

    await handleResendWebhookEvent(
      event("email.bounced", { bounce: { type: "Permanent", subType: "General", message: "x" } }, untagged),
    );

    expect(mockFindByResendId).toHaveBeenCalledWith("msg_1");
    expect(mockRecord).toHaveBeenCalledWith("sub_1", expect.objectContaining({ emailType: "reading_delivery" }));
  });

  it("ignores events about emails that are not customer emails", async () => {
    const notCustomer = { ...BASE_DATA, tags: { submission_id: "sub_1", email_type: "magic_link" } };
    mockFindByResendId.mockResolvedValueOnce(null);

    expect(
      await handleResendWebhookEvent(
        event("email.bounced", { bounce: { type: "Permanent", subType: "General", message: "x" } }, notCustomer),
      ),
    ).toBe("ignored");
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("ignores a failure for an address that has since been corrected", async () => {
    mockFindById.mockResolvedValueOnce({ ...SUBMISSION, email: "ada@example.com" });

    expect(await handleResendWebhookEvent(BOUNCED)).toBe("stale");
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("ignores a failure for an email that a later send of the same type replaced", async () => {
    mockFindById.mockResolvedValueOnce({
      ...SUBMISSION,
      emailsFired: [
        ...(SUBMISSION.emailsFired ?? []),
        { type: "reading_delivery", sentAt: "2026-10-04T13:00:00.000Z", resendId: "msg_2" },
      ],
    });

    expect(await handleResendWebhookEvent(BOUNCED)).toBe("stale");
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it("ignores delivered and opened events", async () => {
    expect(await handleResendWebhookEvent(event("email.delivered"))).toBe("ignored");
    expect(await handleResendWebhookEvent(event("email.opened"))).toBe("ignored");
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("does not record the same event twice", async () => {
    mockFindById.mockResolvedValueOnce({
      ...SUBMISSION,
      emailFailures: [
        {
          emailType: "reading_delivery",
          kind: "bounced",
          recipient: "ada@exmaple.com",
          attemptNumber: 1,
          attemptedAt: null,
          failedAt: "2026-10-04T12:00:05.000Z",
          statusCode: null,
          errorCode: null,
          errorMessage: null,
          bounceType: null,
          resendId: "msg_1",
          resolvedAt: null,
        },
      ],
    });

    expect(await handleResendWebhookEvent(BOUNCED)).toBe("duplicate");
    expect(mockRecord).not.toHaveBeenCalled();
  });
});
