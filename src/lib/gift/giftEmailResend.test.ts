import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/resend", () => ({
  sendGiftPurchase: vi.fn(),
  sendGiftOpened: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchEmailGiftSettings: vi.fn(async () => null),
  fetchReadingPublished: vi.fn(async () => null),
}));

vi.mock("@/lib/analytics/server", () => ({ serverTrack: vi.fn() }));
vi.mock("@sentry/cloudflare", () => ({ captureMessage: vi.fn() }));
vi.mock("./giftSubmissionMirror", () => ({ mirrorGiftSubmission: vi.fn(async () => undefined) }));

vi.mock("@/lib/booking/persistence/sanityStudioRequests", () => ({
  claimResendRequest: vi.fn(async () => undefined),
  restoreResendRequest: vi.fn(async () => undefined),
}));

vi.mock("@/lib/booking/submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/submissions")>()),
  findSubmissionById: vi.fn(),
}));

import {
  type PendingResendRequest,
  restoreResendRequest,
} from "@/lib/booking/persistence/sanityStudioRequests";
import { dbExec } from "@/lib/booking/persistence/sqlClient";
import type { GiftResendRequest } from "@/lib/booking/resendRequest";
import { handleResendRequest } from "@/lib/booking/studioRequests";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { sendGiftOpened, sendGiftPurchase } from "@/lib/resend";
import { captureConsole } from "@/test/captureConsole";
import { giftWithSendToken } from "@/test/fixtures/gift";

import { recordGiftEmailFailure } from "./giftEmailFailures";
import { processGiftResendRequest } from "./giftEmailResend";
import { findGiftById } from "./gifts";
import type { GiftEmailFiredType } from "./types";

const mockPurchase = vi.mocked(sendGiftPurchase);
const mockOpened = vi.mocked(sendGiftOpened);
const mockFindSubmission = vi.mocked(findSubmissionById);

const BUYER_EMAIL = "dana@example.com";
const REQUESTED_AT = "2026-10-05T09:00:00.000Z";
const REQUESTED_MS = Date.parse(REQUESTED_AT);

const RECIPIENT_SUBMISSION: SubmissionRecord = {
  _id: "sub_recipient",
  status: "paid",
  email: "anna@example.com",
  responses: [
    {
      fieldKey: "first_name",
      fieldLabelSnapshot: "First name",
      fieldType: "shortText",
      value: "Anna",
    },
  ],
  createdAt: "2026-10-04T08:00:00.000Z",
  reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$89" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_anna",
  emailsFired: [],
};

async function giftWith(status: "active" | "redeemed" | "cancelled"): Promise<string> {
  const { giftId } = await giftWithSendToken(status, { buyerEmail: BUYER_EMAIL });
  return giftId;
}

async function redeemedGift(redeemedSubmissionId?: string): Promise<string> {
  const giftId = await giftWith("redeemed");
  await dbExec(`UPDATE gift_codes SET redeemed_submission_id = ?, redeemed_at = ? WHERE id = ?`, [
    redeemedSubmissionId ?? giftId,
    "2026-10-04T08:00:00.000Z",
    giftId,
  ]);
  return giftId;
}

function request(submissionId: string, emailType: GiftEmailFiredType): GiftResendRequest {
  return { submissionId, emailType, requestedAt: REQUESTED_AT };
}

const BOUNCE = { kind: "bounced" as const, resendId: "msg_old" };

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://staging.withjosephine.com");
  mockPurchase.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_gc_new" });
  mockOpened.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_go_new" });
  mockFindSubmission.mockReset().mockResolvedValue(null);
  captureConsole();
});

describe("processGiftResendRequest", () => {
  it("resends the buyer confirmation to the stored buyer address under its resend key", async () => {
    const giftId = await giftWith("active");
    await recordGiftEmailFailure(giftId, { emailType: "gift_confirmation", ...BOUNCE });

    expect(await processGiftResendRequest(request(giftId, "gift_confirmation"))).toBe("sent");

    expect(mockPurchase).toHaveBeenCalledWith(expect.objectContaining({ to: BUYER_EMAIL }), {
      giftId,
      idempotencyKey: `gift-confirmation/${giftId}/resend/${REQUESTED_MS}`,
    });
    const gift = (await findGiftById(giftId))!;
    expect(gift.emailsFired.at(-1)).toMatchObject({
      type: "gift_confirmation",
      resendId: "msg_gc_new",
    });
    expect(gift.emailFailures[0]?.resolvedAt).toEqual(expect.any(String));
  });

  it("answers a failed gift email to the recipient with the buyer confirmation and resolves it", async () => {
    const giftId = await giftWith("active");
    await recordGiftEmailFailure(giftId, { emailType: "gift_send", ...BOUNCE });

    expect(await processGiftResendRequest(request(giftId, "gift_send"))).toBe("sent");

    expect(mockPurchase).toHaveBeenCalledWith(expect.objectContaining({ to: BUYER_EMAIL }), {
      giftId,
      idempotencyKey: `gift-confirmation/${giftId}/resend/${REQUESTED_MS}`,
    });
    const gift = (await findGiftById(giftId))!;
    expect(gift.emailFailures.map((failure) => [failure.emailType, failure.resolvedAt])).toEqual([
      ["gift_send", expect.any(String)],
    ]);
  });

  it("resends the gift opened email to the buyer once the gift is opened", async () => {
    const giftId = await redeemedGift();
    mockFindSubmission.mockResolvedValue({
      ...RECIPIENT_SUBMISSION,
      _id: giftId,
      giftCodeId: giftId,
    });

    expect(await processGiftResendRequest(request(giftId, "gift_opened"))).toBe("sent");

    expect(mockOpened).toHaveBeenCalledWith(
      {
        to: BUYER_EMAIL,
        firstName: "Marguerite",
        recipientName: "Anna",
        readingName: "Birth Chart Reading",
      },
      { giftId, idempotencyKey: `gift-opened/${giftId}/resend/${REQUESTED_MS}` },
    );
  });

  it.each([
    ["gift_confirmation", "redeemed", "gift_not_active"],
    ["gift_send", "cancelled", "gift_not_active"],
    ["gift_opened", "active", "gift_not_opened"],
  ] as const)(
    "refuses a %s resend on a %s gift and records why",
    async (emailType, status, errorCode) => {
      const giftId = await giftWith(status);

      expect(await processGiftResendRequest(request(giftId, emailType))).toBe("refused");

      expect(mockPurchase).not.toHaveBeenCalled();
      expect(mockOpened).not.toHaveBeenCalled();
      expect((await findGiftById(giftId))!.emailFailures).toEqual([
        expect.objectContaining({ kind: "refused", errorCode, recipient: "buyer" }),
      ]);
    },
  );

  it("refuses a fourth buyer confirmation in 24 hours", async () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    const sends = JSON.stringify(
      Array.from({ length: 3 }, (_, index) => ({
        type: "gift_confirmation",
        sentAt: recent,
        resendId: `msg_${index}`,
      })),
    );
    const giftId = await giftWith("active");
    await dbExec(`UPDATE gift_codes SET emails_fired_json = ? WHERE id = ?`, [sends, giftId]);

    expect(await processGiftResendRequest(request(giftId, "gift_confirmation"))).toBe("refused");
    expect(mockPurchase).not.toHaveBeenCalled();
  });

  it("records a resend Resend refused, and leaves a concurrent one for later", async () => {
    const giftId = await giftWith("active");
    mockPurchase.mockResolvedValueOnce({ kind: "failed", error: "Resend 500", statusCode: 500 });

    expect(await processGiftResendRequest(request(giftId, "gift_confirmation"))).toBe("failed");
    expect((await findGiftById(giftId))!.emailFailures).toEqual([
      expect.objectContaining({ kind: "send_error", errorCode: "Resend 500" }),
    ]);

    mockPurchase.mockResolvedValueOnce({ kind: "failed", error: "concurrent_idempotent_requests" });
    expect(await processGiftResendRequest(request(giftId, "gift_confirmation"))).toBe("retryLater");
  });

  it("finds the gift of a legacy redemption doc by its redeemed submission id", async () => {
    const giftId = await redeemedGift("sub_recipient");
    mockFindSubmission.mockResolvedValue({ ...RECIPIENT_SUBMISSION, giftCodeId: giftId });

    expect(await processGiftResendRequest(request("sub_recipient", "gift_opened"))).toBe("sent");

    expect(mockFindSubmission.mock.calls).toEqual([["sub_recipient"]]);
    expect(mockOpened).toHaveBeenCalledWith(
      expect.objectContaining({ to: BUYER_EMAIL, recipientName: "Anna" }),
      { giftId, idempotencyKey: `gift-opened/${giftId}/resend/${REQUESTED_MS}` },
    );
  });

  it.each([
    ["the opened reading cannot be read", "gift_opened" as const],
    ["the send throws", "gift_confirmation" as const],
  ])(
    "records a failure and answers failed when %s before any email goes out",
    async (_label, emailType) => {
      const giftId = emailType === "gift_opened" ? await redeemedGift() : await giftWith("active");
      mockFindSubmission.mockRejectedValueOnce(new Error("D1 read failed"));
      mockPurchase.mockRejectedValueOnce(new Error("D1 read failed"));

      expect(await processGiftResendRequest(request(giftId, emailType))).toBe("failed");

      expect((await findGiftById(giftId))!.emailFailures).toEqual([
        expect.objectContaining({ emailType, kind: "send_error", errorMessage: "D1 read failed" }),
      ]);
    },
  );

  it("answers notFound for a doc with no gift", async () => {
    expect(await processGiftResendRequest(request("nothing", "gift_confirmation"))).toBe(
      "notFound",
    );
  });
});

describe("handleResendRequest for gift emails", () => {
  it("retries later and restores the request when the sent email cannot be recorded", async () => {
    const giftId = await giftWith("active");
    await dbExec(
      `CREATE TRIGGER block_gift_failures BEFORE UPDATE OF email_failures_json ON gift_codes
       BEGIN SELECT RAISE(ABORT, 'failures down'); END`,
    );
    const pending = {
      ...request(giftId, "gift_confirmation"),
      kind: "gift",
      revision: "rev_1",
    } as PendingResendRequest;

    expect(await handleResendRequest(pending)).toBe("retryLater");

    expect(mockPurchase).toHaveBeenCalledOnce();
    expect(vi.mocked(restoreResendRequest)).toHaveBeenCalledWith(pending);
    await dbExec(`DROP TRIGGER block_gift_failures`);
  });

  it("routes a gift request to the stored buyer address even when it carries a typed address", async () => {
    const giftId = await giftWith("active");
    const pending = {
      ...request(giftId, "gift_confirmation"),
      kind: "gift",
      revision: "rev_1",
      correctedEmail: "typed@example.com",
    } as PendingResendRequest;

    expect(await handleResendRequest(pending)).toBe("sent");

    expect(mockPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ to: BUYER_EMAIL }),
      expect.anything(),
    );
    expect(JSON.stringify(mockPurchase.mock.calls)).not.toContain("typed@example.com");
  });
});
