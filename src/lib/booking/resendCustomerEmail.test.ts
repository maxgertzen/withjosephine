import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LISTEN_TOKEN_TTL_MS, verifyListenToken } from "@/lib/auth/listenToken";

import type { EmailFailureEntry, EmailFiredEntry, SubmissionRecord } from "./submissions";

vi.mock("./submissions", async () => {
  const actual = await vi.importActual<typeof import("./submissions")>("./submissions");
  return {
    ...actual,
    findSubmissionById: vi.fn(),
    appendEmailFired: vi.fn(),
  };
});

vi.mock("../resend", () => ({
  sendCustomerConfirmation: vi.fn(),
  sendReadingDelivery: vi.fn(),
}));

vi.mock("@/lib/gift/gifts", () => ({
  findGiftById: vi.fn(),
}));

vi.mock("./emailFailures", async () => {
  const actual = await vi.importActual<typeof import("./emailFailures")>("./emailFailures");
  return { ...actual, recordEmailFailure: vi.fn() };
});

vi.mock("./emailCorrection", async () => {
  const actual = await vi.importActual<typeof import("./emailCorrection")>("./emailCorrection");
  return { ...actual, correctCustomerEmail: vi.fn() };
});

vi.mock("./persistence/sanityStudioRequests", () => ({
  claimResendRequest: vi.fn(async () => undefined),
  restoreResendRequest: vi.fn(async () => undefined),
}));

vi.mock("./readingDelivery", async () => {
  const actual = await vi.importActual<typeof import("./readingDelivery")>("./readingDelivery");
  return { ...actual, deliverRequested: vi.fn() };
});

import { findGiftById } from "@/lib/gift/gifts";
import { makeGiftRecord } from "@/test/fixtures/gift";

import { type EmailSendResult, sendCustomerConfirmation, sendReadingDelivery } from "../resend";
import { correctCustomerEmail } from "./emailCorrection";
import { recordEmailFailure } from "./emailFailures";
import {
  type PendingResendRequest,
  restoreResendRequest,
} from "./persistence/sanityStudioRequests";
import { deliverRequested } from "./readingDelivery";
import { READING_ACCESS_TTL_MS } from "./readingRetention";
import { processResendRequest } from "./resendCustomerEmail";
import type { CustomerResendRequest } from "./resendRequest";
import { handleResendRequest } from "./studioRequests";
import { appendEmailFired, findSubmissionById } from "./submissions";

const mockFind = vi.mocked(findSubmissionById);
const mockAppend = vi.mocked(appendEmailFired);
const mockSendConfirmation = vi.mocked(sendCustomerConfirmation);
const mockFindGift = vi.mocked(findGiftById);
const mockSendReading = vi.mocked(sendReadingDelivery);
const mockRecordFailure = vi.mocked(recordEmailFailure);
const mockCorrect = vi.mocked(correctCustomerEmail);
const mockDeliverRequested = vi.mocked(deliverRequested);

function orderConfirmation(result: EmailSendResult) {
  return { firedType: "order_confirmation", result } as const;
}

function giftRecipientConfirmation(result: EmailSendResult) {
  return { firedType: "gift_recipient_confirmation", result } as const;
}

const NOW = new Date("2026-10-04T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const ORDER_REQUEST: CustomerResendRequest = {
  submissionId: "sub_1",
  emailType: "order_confirmation",
  correctedEmail: null,
  requestedAt: "2026-10-04T11:58:00.000Z",
};

const READING_REQUEST: CustomerResendRequest = { ...ORDER_REQUEST, emailType: "reading_delivery" };

const READING_SENT: EmailFiredEntry = {
  type: "reading_delivery",
  sentAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(),
  resendId: "msg_first",
};

const OPEN_BOUNCE: EmailFailureEntry = {
  emailType: "reading_delivery",
  kind: "bounced",
  recipient: "ada@exmaple.com",
  attemptNumber: 1,
  attemptedAt: READING_SENT.sentAt,
  failedAt: READING_SENT.sentAt,
  statusCode: null,
  errorCode: null,
  errorMessage: "Mailbox does not exist",
  bounceType: "Permanent / General",
  resendId: "msg_first",
  resolvedAt: null,
};

function paidSubmission(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_1",
    status: "paid",
    email: "ada@example.com",
    responses: [],
    createdAt: "2026-09-20T00:00:00.000Z",
    paidAt: "2026-09-20T00:05:00.000Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: "user_1",
    emailsFired: [],
    emailFailures: [],
    ...overrides,
  };
}

function recordedFailure() {
  return mockRecordFailure.mock.calls[0]?.[1];
}

async function tokenExpiryOfReadingSend(): Promise<number | undefined> {
  const listenUrl = mockSendReading.mock.calls[0]?.[1] ?? "";
  const token = new URL(listenUrl).searchParams.get("t") ?? "";
  const verified = await verifyListenToken({ token, currentRecipientUserId: "user_1" });
  return verified.valid ? verified.expMs : undefined;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockFind.mockReset().mockResolvedValue(paidSubmission());
  mockAppend.mockReset().mockResolvedValue(undefined);
  mockSendConfirmation
    .mockReset()
    .mockImplementation(async (_context, { giftBuyerFirstName }) =>
      giftBuyerFirstName === undefined
        ? orderConfirmation({ kind: "sent", resendId: "msg_resent" })
        : giftRecipientConfirmation({ kind: "sent", resendId: "msg_gift" }),
    );
  mockFindGift
    .mockReset()
    .mockResolvedValue(makeGiftRecord({ id: "gift_1", buyerFirstName: "Dana" }));
  mockSendReading.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_resent" });
  mockRecordFailure.mockReset().mockResolvedValue(undefined);
  mockCorrect.mockReset().mockImplementation(async (submission, email) => ({
    ...submission,
    email,
    recipientUserId: "user_corrected",
  }));
  mockDeliverRequested.mockReset().mockResolvedValue("sent");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("processResendRequest", () => {
  it("returns notFound when the submission does not exist", async () => {
    mockFind.mockResolvedValueOnce(null);

    expect(await processResendRequest(ORDER_REQUEST)).toBe("notFound");
    expect(mockSendConfirmation).not.toHaveBeenCalled();
  });

  it("refuses an unpaid submission without recording a failed send", async () => {
    mockFind.mockResolvedValueOnce(paidSubmission({ status: "pending" }));

    expect(await processResendRequest(ORDER_REQUEST)).toBe("refused");
    expect(mockSendConfirmation).not.toHaveBeenCalled();
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it("resends the order confirmation under a per-request key and records it", async () => {
    expect(await processResendRequest(ORDER_REQUEST)).toBe("sent");

    expect(mockSendConfirmation.mock.calls[0]?.[1]).toMatchObject({
      idempotencyKey: `order-confirmation/sub_1/resend/${Date.parse(ORDER_REQUEST.requestedAt)}`,
    });
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      { type: "order_confirmation", sentAt: NOW.toISOString(), resendId: "msg_resent" },
      undefined,
    );
  });

  it("records a dry run with no Resend id", async () => {
    mockSendConfirmation.mockResolvedValueOnce(orderConfirmation({ kind: "dry_run" }));

    expect(await processResendRequest(ORDER_REQUEST)).toBe("dryRun");
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ resendId: null }),
      undefined,
    );
  });

  it("records send_error and appends nothing when Resend refuses", async () => {
    mockSendConfirmation.mockResolvedValueOnce(
      orderConfirmation({ kind: "failed", error: "validation_error", statusCode: 422 }),
    );

    expect(await processResendRequest(ORDER_REQUEST)).toBe("failed");
    expect(recordedFailure()).toMatchObject({
      emailType: "order_confirmation",
      kind: "send_error",
      recipient: "ada@example.com",
      statusCode: 422,
      errorCode: "validation_error",
    });
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it("asks for a later retry without a failure when Resend reports a concurrent request", async () => {
    mockSendConfirmation.mockResolvedValueOnce(
      orderConfirmation({
        kind: "failed",
        error: "concurrent_idempotent_requests",
        statusCode: 409,
      }),
    );

    expect(await processResendRequest(ORDER_REQUEST)).toBe("retryLater");
    expect(mockRecordFailure).not.toHaveBeenCalled();
  });

  it("retries later and restores the request when the sent email cannot be recorded", async () => {
    mockAppend.mockRejectedValueOnce(new Error("D1 busy"));
    const pending = {
      ...ORDER_REQUEST,
      kind: "customer",
      revision: "rev_1",
    } as PendingResendRequest;

    expect(await handleResendRequest(pending)).toBe("retryLater");

    expect(mockSendConfirmation).toHaveBeenCalledOnce();
    expect(mockRecordFailure).not.toHaveBeenCalled();
    expect(vi.mocked(restoreResendRequest)).toHaveBeenCalledWith(pending);
  });

  it("records an error before the send as a failure, so it shows in Failed sends", async () => {
    mockCorrect.mockRejectedValueOnce(new Error("correction write failed"));

    expect(
      await processResendRequest({ ...ORDER_REQUEST, correctedEmail: "ada@example.org" }),
    ).toBe("failed");

    expect(mockSendConfirmation).not.toHaveBeenCalled();
    expect(recordedFailure()).toMatchObject({
      kind: "send_error",
      recipient: "ada@example.com",
      errorMessage: "correction write failed",
    });
  });

  it("records an error from the first reading delivery as a failure", async () => {
    mockDeliverRequested.mockRejectedValueOnce(new Error("R2 unreachable"));

    expect(await processResendRequest(READING_REQUEST)).toBe("failed");
    expect(recordedFailure()).toMatchObject({
      emailType: "reading_delivery",
      kind: "send_error",
      errorMessage: "R2 unreachable",
    });
  });

  it("records the thrown error as a failure", async () => {
    mockSendConfirmation.mockRejectedValueOnce(new Error("Resend unreachable"));

    expect(await processResendRequest(ORDER_REQUEST)).toBe("failed");
    expect(recordedFailure()).toMatchObject({
      kind: "send_error",
      errorMessage: "Resend unreachable",
    });
  });

  it("refuses after 3 sends of the same email in 24 hours", async () => {
    const recent = (hoursAgo: number): EmailFiredEntry => ({
      type: "order_confirmation",
      sentAt: new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      resendId: null,
    });
    mockFind.mockResolvedValueOnce(
      paidSubmission({ emailsFired: [recent(1), recent(2), recent(3)] }),
    );

    expect(await processResendRequest(ORDER_REQUEST)).toBe("refused");
    expect(mockSendConfirmation).not.toHaveBeenCalled();
    expect(recordedFailure()).toMatchObject({ kind: "refused", errorCode: "rate_limited" });
  });

  it("counts legacy day7 entries toward the reading delivery limit", async () => {
    const legacy = {
      ...READING_SENT,
      type: "day7",
      sentAt: NOW.toISOString(),
    } as unknown as EmailFiredEntry;
    mockFind.mockResolvedValueOnce(paidSubmission({ emailsFired: [legacy, legacy, legacy] }));

    expect(await processResendRequest(READING_REQUEST)).toBe("refused");
    expect(mockSendReading).not.toHaveBeenCalled();
  });

  describe("address correction", () => {
    it("corrects the address, then sends to the corrected one", async () => {
      expect(
        await processResendRequest({ ...ORDER_REQUEST, correctedEmail: "ada@example.org" }),
      ).toBe("sent");

      expect(mockCorrect).toHaveBeenCalledWith(paidSubmission(), "ada@example.org");
      expect(mockSendConfirmation.mock.calls[0]?.[0]).toMatchObject({ email: "ada@example.org" });
    });

    it("does not correct when the typed address is the same one", async () => {
      await processResendRequest({ ...ORDER_REQUEST, correctedEmail: " ADA@example.com " });

      expect(mockCorrect).not.toHaveBeenCalled();
    });

    it("refuses an invalid address without correcting or sending", async () => {
      expect(await processResendRequest({ ...ORDER_REQUEST, correctedEmail: "ada@example" })).toBe(
        "refused",
      );

      expect(mockCorrect).not.toHaveBeenCalled();
      expect(mockSendConfirmation).not.toHaveBeenCalled();
      expect(recordedFailure()).toMatchObject({
        kind: "refused",
        errorCode: "invalid_address",
        recipient: "ada@example",
      });
    });
  });

  describe("reading delivery", () => {
    it("restarts the access window when a reading delivery failure is open", async () => {
      mockFind.mockResolvedValueOnce(
        paidSubmission({
          deliveredAt: new Date(NOW.getTime() - 85 * DAY_MS).toISOString(),
          emailsFired: [READING_SENT],
          emailFailures: [OPEN_BOUNCE],
        }),
      );

      expect(await processResendRequest(READING_REQUEST)).toBe("sent");
      expect(await tokenExpiryOfReadingSend()).toBe(NOW.getTime() + LISTEN_TOKEN_TTL_MS);
      expect(mockAppend).toHaveBeenCalledWith(
        "sub_1",
        expect.objectContaining({ type: "reading_delivery", sentAt: NOW.toISOString() }),
        { deliveredAt: NOW.toISOString() },
      );
    });

    it("keeps deliveredAt and caps the link to the access window when no failure is open", async () => {
      const deliveredAtMs = NOW.getTime() - 85 * DAY_MS;
      mockFind.mockResolvedValueOnce(
        paidSubmission({
          deliveredAt: new Date(deliveredAtMs).toISOString(),
          emailsFired: [READING_SENT],
        }),
      );

      expect(await processResendRequest(READING_REQUEST)).toBe("sent");
      expect(await tokenExpiryOfReadingSend()).toBe(deliveredAtMs + READING_ACCESS_TTL_MS);
      expect(mockAppend.mock.calls[0]?.[2]).toBeUndefined();
    });

    it("does not restart the access window for an earlier refused resend", async () => {
      mockFind.mockResolvedValueOnce(
        paidSubmission({
          deliveredAt: new Date(NOW.getTime() - 100 * DAY_MS).toISOString(),
          emailsFired: [READING_SENT],
          emailFailures: [{ ...OPEN_BOUNCE, kind: "refused", errorCode: "reading_expired" }],
        }),
      );

      expect(await processResendRequest(READING_REQUEST)).toBe("refused");
      expect(mockSendReading).not.toHaveBeenCalled();
      expect(mockAppend).not.toHaveBeenCalled();
    });

    it("refuses when the access window has ended and no failure is open", async () => {
      mockFind.mockResolvedValueOnce(
        paidSubmission({
          deliveredAt: new Date(NOW.getTime() - 91 * DAY_MS).toISOString(),
          emailsFired: [READING_SENT],
        }),
      );

      expect(await processResendRequest(READING_REQUEST)).toBe("refused");
      expect(mockSendReading).not.toHaveBeenCalled();
      expect(recordedFailure()).toMatchObject({ errorCode: "reading_expired" });
    });

    it("refuses when the submission has no recipient user", async () => {
      mockFind.mockResolvedValueOnce(
        paidSubmission({ recipientUserId: null, emailsFired: [READING_SENT] }),
      );

      expect(await processResendRequest(READING_REQUEST)).toBe("refused");
      expect(recordedFailure()).toMatchObject({ errorCode: "missing_recipient_user" });
    });

    it.each([
      ["sent", "sent"],
      ["alreadySent", "sent"],
      ["dryRun", "dryRun"],
      ["retryLater", "retryLater"],
      ["skipped", "failed"],
    ] as const)(
      "sends a never-sent reading through the first-send path (%s gives %s)",
      async (deliverOutcome, resendOutcome) => {
        mockDeliverRequested.mockResolvedValueOnce(deliverOutcome);

        expect(await processResendRequest(READING_REQUEST)).toBe(resendOutcome);
        expect(mockDeliverRequested).toHaveBeenCalledWith("sub_1");
        expect(mockSendReading).not.toHaveBeenCalled();
        expect(mockAppend).not.toHaveBeenCalled();
      },
    );

    it("corrects the address before the first send", async () => {
      await processResendRequest({ ...READING_REQUEST, correctedEmail: "ada@example.org" });

      expect(mockCorrect.mock.invocationCallOrder[0]).toBeLessThan(
        mockDeliverRequested.mock.invocationCallOrder[0] ?? 0,
      );
    });

    it("refuses a never-sent reading whose files are not published", async () => {
      mockDeliverRequested.mockResolvedValueOnce("awaitingAssets");

      expect(await processResendRequest(READING_REQUEST)).toBe("refused");
      expect(recordedFailure()).toMatchObject({ kind: "refused", errorCode: "files_missing" });
    });
  });
});

describe("processResendRequest on a gift submission", () => {
  const GIFT_SUBMISSION = paidSubmission({
    giftCodeId: "gift_1",
    amountPaidCents: null,
    amountPaidCurrency: null,
  });

  beforeEach(() => {
    mockFind.mockResolvedValue(GIFT_SUBMISSION);
  });

  it("resends the gift confirmation with the buyer's name and records it as the gift confirmation", async () => {
    expect(await processResendRequest(ORDER_REQUEST)).toBe("sent");

    expect(mockFindGift).toHaveBeenCalledWith("gift_1");
    expect(mockSendConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sub_1", email: "ada@example.com" }),
      expect.objectContaining({
        giftBuyerFirstName: "Dana",
        idempotencyKey: `order-confirmation/sub_1/resend/${Date.parse(ORDER_REQUEST.requestedAt)}`,
      }),
    );
    expect(mockAppend).toHaveBeenCalledWith(
      "sub_1",
      { type: "gift_recipient_confirmation", sentAt: NOW.toISOString(), resendId: "msg_gift" },
      undefined,
    );
  });

  it("falls back to an empty buyer name when the gift row is gone", async () => {
    mockFindGift.mockResolvedValueOnce(null);

    await processResendRequest(ORDER_REQUEST);

    expect(mockSendConfirmation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ giftBuyerFirstName: "" }),
    );
  });

  it("counts earlier gift confirmations toward the resend limit", async () => {
    const sentAt = new Date(NOW.getTime() - 60_000).toISOString();
    mockFind.mockResolvedValueOnce({
      ...GIFT_SUBMISSION,
      emailsFired: Array.from({ length: 3 }, (_, index) => ({
        type: "gift_recipient_confirmation" as const,
        sentAt,
        resendId: `msg_${index}`,
      })),
    });

    expect(await processResendRequest(ORDER_REQUEST)).toBe("refused");
    expect(mockSendConfirmation).not.toHaveBeenCalled();
  });

  it("records a failed gift confirmation resend as an order confirmation failure", async () => {
    mockSendConfirmation.mockResolvedValueOnce(
      giftRecipientConfirmation({ kind: "failed", error: "validation_error", statusCode: 422 }),
    );

    expect(await processResendRequest(ORDER_REQUEST)).toBe("failed");
    expect(recordedFailure()).toMatchObject({
      emailType: "order_confirmation",
      kind: "send_error",
    });
  });
});
