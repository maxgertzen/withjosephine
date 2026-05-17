import { describe, expect, it } from "vitest";

import { giftResendRateLimit, giftStatusFor } from "../giftStatus";
import type { EmailFiredEntry, SubmissionRecord } from "../submissions";

function baseRecord(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_gift",
    status: "paid",
    email: "purchaser@example.com",
    responses: [],
    createdAt: "2026-05-01T00:00:00.000Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: null,
    isGift: true,
    purchaserUserId: "user_purchaser",
    recipientEmail: "recipient@example.com",
    giftDeliveryMethod: "scheduled",
    giftSendAt: "2026-06-01T15:00:00.000Z",
    giftMessage: null,
    giftClaimTokenHash: null,
    giftClaimEmailFiredAt: null,
    giftClaimedAt: null,
    giftCancelledAt: null,
    ...overrides,
  };
}

describe("giftStatusFor", () => {
  it("returns scheduled before the claim email fires", () => {
    expect(giftStatusFor(baseRecord())).toEqual({
      kind: "scheduled",
      sendAt: "2026-06-01T15:00:00.000Z",
    });
  });

  it("returns self_send_ready when delivery method is self_send", () => {
    const record = baseRecord({
      giftDeliveryMethod: "self_send",
      giftClaimEmailFiredAt: "2026-05-01T00:01:00.000Z",
      giftSendAt: null,
    });
    expect(giftStatusFor(record)).toEqual({
      kind: "self_send_ready",
      firedAt: "2026-05-01T00:01:00.000Z",
    });
  });

  it("returns sent_waiting_recipient after the claim email fires (scheduled mode)", () => {
    const record = baseRecord({
      giftClaimEmailFiredAt: "2026-06-01T15:00:01.000Z",
    });
    expect(giftStatusFor(record)).toEqual({
      kind: "sent_waiting_recipient",
      firedAt: "2026-06-01T15:00:01.000Z",
    });
  });

  it("returns recipient_preparing once the recipient claims", () => {
    const record = baseRecord({
      giftClaimEmailFiredAt: "2026-06-01T15:00:01.000Z",
      giftClaimedAt: "2026-06-02T12:00:00.000Z",
    });
    expect(giftStatusFor(record)).toEqual({
      kind: "recipient_preparing",
      claimedAt: "2026-06-02T12:00:00.000Z",
    });
  });

  it("returns delivered once Josephine ships the voice note", () => {
    const record = baseRecord({
      giftClaimEmailFiredAt: "2026-06-01T15:00:01.000Z",
      giftClaimedAt: "2026-06-02T12:00:00.000Z",
      deliveredAt: "2026-06-09T12:00:00.000Z",
      voiceNoteUrl: "https://r2.local/voice.mp3",
      pdfUrl: "https://r2.local/reading.pdf",
    });
    expect(giftStatusFor(record)).toEqual({
      kind: "delivered",
      deliveredAt: "2026-06-09T12:00:00.000Z",
    });
  });

  it("returns cancelled when the purchaser cancelled (admin path)", () => {
    const record = baseRecord({ giftCancelledAt: "2026-05-15T10:00:00.000Z" });
    expect(giftStatusFor(record)).toEqual({
      kind: "cancelled",
      cancelledAt: "2026-05-15T10:00:00.000Z",
    });
  });
});

describe("giftResendRateLimit", () => {
  const NOW = Date.parse("2026-05-10T12:00:00.000Z");

  function entry(type: EmailFiredEntry["type"], sentAt: string): EmailFiredEntry {
    return { type, sentAt, resendId: "msg_test" };
  }

  it("allows when no gift_resend entries exist", () => {
    expect(giftResendRateLimit([], NOW)).toEqual({ allowed: true });
    expect(giftResendRateLimit(undefined, NOW)).toEqual({ allowed: true });
  });

  it("blocks when a gift_resend entry sits inside the trailing hour", () => {
    const recent = entry("gift_resend", "2026-05-10T11:30:00.000Z");
    expect(giftResendRateLimit([recent], NOW)).toEqual({
      allowed: false,
      reason: "hour_cap",
    });
  });

  it("blocks when ≥3 gift_resend entries sit inside the trailing day", () => {
    const dayAgo = [
      entry("gift_resend", "2026-05-10T02:00:00.000Z"),
      entry("gift_resend", "2026-05-09T16:00:00.000Z"),
      entry("gift_resend", "2026-05-09T15:00:00.000Z"),
    ];
    expect(giftResendRateLimit(dayAgo, NOW)).toEqual({
      allowed: false,
      reason: "day_cap",
    });
  });

  it("allows after the day window slides past three older entries", () => {
    const stale = [
      entry("gift_resend", "2026-05-08T16:00:00.000Z"),
      entry("gift_resend", "2026-05-08T15:00:00.000Z"),
      entry("gift_resend", "2026-05-08T14:00:00.000Z"),
    ];
    expect(giftResendRateLimit(stale, NOW)).toEqual({ allowed: true });
  });

  it("ignores entries of other types", () => {
    const noise = [
      entry("gift_claim", "2026-05-10T11:30:00.000Z"),
      entry("day7", "2026-05-10T11:00:00.000Z"),
    ];
    expect(giftResendRateLimit(noise, NOW)).toEqual({ allowed: true });
  });
});
