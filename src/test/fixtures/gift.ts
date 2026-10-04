import type { GiftRecord } from "@/lib/gift/types";

const BASE_GIFT: GiftRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  lookupHash: "0".repeat(64),
  readingSlug: "birth-chart",
  status: "pending",
  buyerFirstName: "Ada",
  buyerEmail: null,
  note: null,
  coolingOffAcknowledgedAt: "2026-10-01T10:00:00.000Z",
  consentLabel: "I agree",
  consentIpAddress: null,
  stripeSessionId: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  activatedAt: null,
  buyerEmailClaimedAt: null,
  recipientName: null,
  recipientEmail: null,
  sendCount: 0,
  lastSentAt: null,
  redeemedSubmissionId: null,
  redeemedAt: null,
  expiredAt: null,
  updatedAt: "2026-10-01T10:00:00.000Z",
  emailsFired: [],
};

export function makeGiftRecord(overrides: Partial<GiftRecord> = {}): GiftRecord {
  return { ...BASE_GIFT, ...overrides };
}
