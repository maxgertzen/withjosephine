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
  GIFT_EMAIL_TAG: { giftId: "gift_id", emailType: "email_type" },
}));

vi.mock("../gift/gifts", () => ({
  findGiftById: vi.fn(),
  findGiftByResendId: vi.fn(),
}));

vi.mock("../gift/giftEmailFailures", () => ({
  recordGiftEmailFailure: vi.fn(),
  releaseBouncedGiftSend: vi.fn(),
}));

import type { WebhookEventPayload } from "resend";

import { makeGiftRecord } from "@/test/fixtures/gift";

import { recordGiftEmailFailure, releaseBouncedGiftSend } from "../gift/giftEmailFailures";
import { findGiftById, findGiftByResendId } from "../gift/gifts";
import { recordEmailFailure } from "./emailFailures";
import { handleResendWebhookEvent } from "./resendWebhook";
import { findSubmissionById, findSubmissionByResendId, type SubmissionRecord } from "./submissions";

const mockFindById = vi.mocked(findSubmissionById);
const mockFindByResendId = vi.mocked(findSubmissionByResendId);
const mockRecord = vi.mocked(recordEmailFailure);
const mockFindGift = vi.mocked(findGiftById);
const mockFindGiftByResendId = vi.mocked(findGiftByResendId);
const mockRecordGift = vi.mocked(recordGiftEmailFailure);
const mockReleaseSend = vi.mocked(releaseBouncedGiftSend);

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
  emailsFired: [
    { type: "reading_delivery", sentAt: "2026-10-04T12:00:00.000Z", resendId: "msg_1" },
  ],
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

function event(
  type: string,
  extra: Record<string, unknown> = {},
  data: Record<string, unknown> = BASE_DATA,
) {
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
  mockFindGift.mockReset().mockResolvedValue(null);
  mockFindGiftByResendId.mockReset().mockResolvedValue(null);
  mockRecordGift.mockReset().mockResolvedValue(undefined);
  mockReleaseSend.mockReset().mockResolvedValue(undefined);
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
    [
      "email.suppressed",
      { suppressed: { type: "bounce", message: "On suppression list" } },
      "suppressed",
      "On suppression list",
    ],
    [
      "email.failed",
      { failed: { reason: "reached_daily_quota" } },
      "send_error",
      "reached_daily_quota",
    ],
  ] as const)("records %s as %s", async (type, extra, kind, errorMessage) => {
    await handleResendWebhookEvent(event(type, extra));

    expect(mockRecord).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ kind, errorMessage }),
    );
  });

  it("finds an untagged email by its Resend id", async () => {
    const untagged = { ...BASE_DATA, tags: undefined } as unknown as typeof BASE_DATA;

    await handleResendWebhookEvent(
      event(
        "email.bounced",
        { bounce: { type: "Permanent", subType: "General", message: "x" } },
        untagged,
      ),
    );

    expect(mockFindByResendId).toHaveBeenCalledWith("msg_1");
    expect(mockRecord).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ emailType: "reading_delivery" }),
    );
  });

  it("files an untagged gift confirmation bounce under the order confirmation", async () => {
    const untagged = { ...BASE_DATA, tags: undefined } as unknown as typeof BASE_DATA;
    mockFindByResendId.mockResolvedValueOnce({
      ...SUBMISSION,
      emailsFired: [
        {
          type: "gift_recipient_confirmation",
          sentAt: "2026-10-04T12:00:00.000Z",
          resendId: "msg_1",
        },
      ],
    });

    await handleResendWebhookEvent(
      event(
        "email.bounced",
        { bounce: { type: "Permanent", subType: "General", message: "x" } },
        untagged,
      ),
    );

    expect(mockRecord).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ emailType: "order_confirmation" }),
    );
  });

  it("treats a gift confirmation bounce as stale after a later gift confirmation resend", async () => {
    const giftBounce = {
      ...BASE_DATA,
      tags: { submission_id: "sub_1", email_type: "order_confirmation" },
    };
    mockFindById.mockResolvedValueOnce({
      ...SUBMISSION,
      emailsFired: [
        {
          type: "gift_recipient_confirmation",
          sentAt: "2026-10-04T12:00:00.000Z",
          resendId: "msg_1",
        },
        {
          type: "gift_recipient_confirmation",
          sentAt: "2026-10-04T13:00:00.000Z",
          resendId: "msg_2",
        },
      ],
    });

    expect(
      await handleResendWebhookEvent(
        event(
          "email.bounced",
          { bounce: { type: "Permanent", subType: "General", message: "x" } },
          giftBounce,
        ),
      ),
    ).toBe("stale");
  });

  it("ignores events about emails that are not customer emails", async () => {
    const notCustomer = {
      ...BASE_DATA,
      tags: { submission_id: "sub_1", email_type: "magic_link" },
    };
    mockFindByResendId.mockResolvedValueOnce(null);

    expect(
      await handleResendWebhookEvent(
        event(
          "email.bounced",
          { bounce: { type: "Permanent", subType: "General", message: "x" } },
          notCustomer,
        ),
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

describe("handleResendWebhookEvent for gift emails", () => {
  const GIFT = makeGiftRecord({
    id: "gift_1",
    status: "active",
    buyerEmail: "dana@example.com",
    sendCount: 1,
    emailsFired: [
      { type: "gift_confirmation", sentAt: "2026-10-04T11:00:00.000Z", resendId: "msg_gc" },
      { type: "gift_send", sentAt: "2026-10-04T12:00:00.000Z", resendId: "msg_gs" },
    ],
  });
  const giftData = (emailType: string, emailId: string) => ({
    ...BASE_DATA,
    email_id: emailId,
    to: ["anna@example.com"],
    tags: { gift_id: "gift_1", email_type: emailType },
  });
  const giftBounce = (emailType: string, emailId: string) =>
    event(
      "email.bounced",
      {
        bounce: { type: "Permanent", subType: "General", message: "550 anna@example.com unknown" },
      },
      giftData(emailType, emailId),
    );

  beforeEach(() => {
    mockFindGift.mockResolvedValue(GIFT);
  });

  it("records a tagged gift bounce on the gift, by role, and never as a booking", async () => {
    expect(await handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"))).toBe("recorded");

    expect(mockFindGift).toHaveBeenCalledWith("gift_1");
    expect(mockRecordGift).toHaveBeenCalledWith("gift_1", {
      emailType: "gift_send",
      kind: "bounced",
      attemptedAt: "2026-10-04T12:00:00.000Z",
      failedAt: "2026-10-04T12:00:05.000Z",
      resendId: "msg_gs",
      bounceType: "Permanent / General",
      errorMessage: "550 anna@example.com unknown",
    });
    expect(mockRecordGift.mock.calls[0]![1]).not.toHaveProperty("recipient");
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("gives the send slot back before recording the bounce", async () => {
    await handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"));

    expect(mockReleaseSend).toHaveBeenCalledWith(GIFT, "msg_gs");
    expect(mockReleaseSend).toHaveBeenCalledBefore(mockRecordGift);
  });

  it("fails loudly and records nothing when the slot release fails, so Resend retries", async () => {
    mockReleaseSend.mockRejectedValueOnce(new Error("D1 busy"));

    await expect(handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"))).rejects.toThrow(
      "D1 busy",
    );
    expect(mockRecordGift).not.toHaveBeenCalled();
  });

  it.each([
    ["a buyer email bounces", giftBounce("gift_confirmation", "msg_gc")],
    [
      "a gift email is only complained about",
      event("email.complained", {}, giftData("gift_send", "msg_gs")),
    ],
  ])("keeps the send slot when %s", async (_label, failure) => {
    await handleResendWebhookEvent(failure);

    expect(mockRecordGift).toHaveBeenCalled();
    expect(mockReleaseSend).not.toHaveBeenCalled();
  });

  it("finds an untagged gift email by its Resend id when no submission sent it", async () => {
    mockFindByResendId.mockResolvedValue(null);
    mockFindGiftByResendId.mockResolvedValue(GIFT);

    expect(
      await handleResendWebhookEvent(
        event(
          "email.bounced",
          { bounce: { type: "Permanent", subType: "General", message: "gone" } },
          { ...BASE_DATA, email_id: "msg_gc", tags: undefined as never },
        ),
      ),
    ).toBe("recorded");

    expect(mockFindGiftByResendId).toHaveBeenCalledWith("msg_gc");
    expect(mockRecordGift).toHaveBeenCalledWith(
      "gift_1",
      expect.objectContaining({ emailType: "gift_confirmation" }),
    );
  });

  it("skips a gift failure already recorded for the same email", async () => {
    mockFindGift.mockResolvedValue({
      ...GIFT,
      emailFailures: [
        {
          emailType: "gift_send",
          kind: "bounced",
          recipient: "recipient",
          attemptNumber: 1,
          attemptedAt: null,
          failedAt: "2026-10-04T12:00:05.000Z",
          statusCode: null,
          errorCode: null,
          errorMessage: null,
          bounceType: null,
          resendId: "msg_gs",
          resolvedAt: null,
        },
      ],
    });

    expect(await handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"))).toBe("duplicate");
    expect(mockRecordGift).not.toHaveBeenCalled();
    expect(mockReleaseSend).not.toHaveBeenCalled();
  });

  it("calls a bounce stale when a newer send of the same email went out after it", async () => {
    mockFindGift.mockResolvedValue({
      ...GIFT,
      emailsFired: [
        ...GIFT.emailsFired,
        { type: "gift_send", sentAt: "2026-10-04T13:00:00.000Z", resendId: "msg_gs_2" },
      ],
    });

    expect(await handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"))).toBe("stale");
    expect(mockRecordGift).not.toHaveBeenCalled();
  });

  it("does not look for a gift when the email carries a booking tag", async () => {
    await handleResendWebhookEvent(BOUNCED);

    expect(mockFindGift).not.toHaveBeenCalled();
    expect(mockFindGiftByResendId).not.toHaveBeenCalled();
  });

  it("ignores a gift-tagged event whose gift is gone, without scanning submissions", async () => {
    mockFindGift.mockResolvedValue(null);

    expect(await handleResendWebhookEvent(giftBounce("gift_send", "msg_gs"))).toBe("ignored");
    expect(mockFindByResendId).not.toHaveBeenCalled();
    expect(mockFindGiftByResendId).not.toHaveBeenCalled();
  });

  it("scans gifts for an untagged event only when no submission sent it", async () => {
    await handleResendWebhookEvent(
      event(
        "email.bounced",
        { bounce: { type: "Permanent", subType: "General", message: "gone" } },
        { ...BASE_DATA, tags: undefined as never },
      ),
    );

    expect(mockFindByResendId).toHaveBeenCalledWith("msg_1");
    expect(mockFindGiftByResendId).not.toHaveBeenCalled();
  });
});
