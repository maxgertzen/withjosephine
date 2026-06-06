import { describe, expect, it } from "vitest";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import type { SubmissionRecord } from "@/lib/page-previews/types";

import { computeResendVerdict, toGiftCardData } from "../giftCardData";

const NOW_MS = Date.UTC(2026, 5, 6, 12, 0, 0); // 2026-06-06T12:00:00Z

function makeGift(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_1",
    _type: "submission",
    submissionId: "sub_1",
    readingSlug: "soul-blueprint",
    purchaserEmail: "p@example.com",
    purchaserUserId: "user_p",
    recipientEmail: "r@example.com",
    recipientUserId: "user_r",
    recipientFirstName: "River",
    isGift: true,
    giftDeliveryMethod: GIFT_DELIVERY.selfSend,
    giftSendAt: null,
    paymentStatus: "paid",
    paymentReceivedAt: new Date(NOW_MS - 10 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(NOW_MS - 10 * 24 * 60 * 60 * 1000).toISOString(),
    deliveredAt: null,
    voiceNoteUrl: null,
    pdfUrl: null,
    discountAmountUsd: null,
    promoCode: null,
    promoCodeKey: null,
    responses: {},
    reading: { name: "Soul Blueprint" },
    emailsFired: [],
    ...overrides,
  } as unknown as SubmissionRecord;
}

describe("computeResendVerdict", () => {
  it("returns undefined for non-selfSend gifts", () => {
    const gift = makeGift({ giftDeliveryMethod: GIFT_DELIVERY.scheduled });
    expect(computeResendVerdict(gift, NOW_MS)).toBeUndefined();
  });

  it("returns allowed when there are no prior resends", () => {
    expect(computeResendVerdict(makeGift(), NOW_MS)).toEqual({ allowed: true });
  });

  it("blocks on hour_cap when one resend landed within the hour", () => {
    const gift = makeGift({
      emailsFired: [
        {
          type: "gift_resend",
          sentAt: new Date(NOW_MS - 10 * 60 * 1000).toISOString(),
          resendId: null,
        },
      ],
    });
    const v = computeResendVerdict(gift, NOW_MS);
    expect(v).toEqual({
      allowed: false,
      reason: "hour_cap",
      nextAvailableAt: new Date(NOW_MS - 10 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    });
  });

  it("blocks on day_cap when three resends landed within the day, surfacing the oldest-in-window roll-forward", () => {
    const sends = [
      NOW_MS - 5 * 60 * 60 * 1000,
      NOW_MS - 10 * 60 * 60 * 1000,
      NOW_MS - 20 * 60 * 60 * 1000,
    ];
    const gift = makeGift({
      emailsFired: sends.map((t) => ({
        type: "gift_resend" as const,
        sentAt: new Date(t).toISOString(),
        resendId: null,
      })),
    });
    const v = computeResendVerdict(gift, NOW_MS);
    expect(v).toEqual({
      allowed: false,
      reason: "day_cap",
      nextAvailableAt: new Date(sends[2] + 24 * 60 * 60 * 1000).toISOString(),
    });
  });
});

describe("toGiftCardData", () => {
  it("drops purchaser email and includes only recipient-safe fields", () => {
    const gift = makeGift({ giftSendAt: new Date(NOW_MS).toISOString() });
    const card = toGiftCardData(gift, NOW_MS);
    expect(card).toEqual({
      _id: "sub_1",
      responses: {},
      recipientEmail: "r@example.com",
      giftSendAt: new Date(NOW_MS).toISOString(),
      resendVerdict: { allowed: true },
    });
    expect(card).not.toHaveProperty("purchaserEmail");
    expect(card).not.toHaveProperty("purchaserUserId");
  });
});
