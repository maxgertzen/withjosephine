/**
 * Fixture data for the Studio-iframed `/preview/*` routes.
 *
 * These fixtures let Becky see each per-state variant of the gated user-
 * specific pages without engineering a real session. NO real submissions /
 * users / R2 objects are touched by any consumer.
 */
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { SUBMISSION_STATUS } from "@/lib/booking/submissions";

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

function fixtureSubmission(overrides: Partial<SubmissionRecord> & { _id: string }): SubmissionRecord {
  return {
    status: SUBMISSION_STATUS.paid,
    email: "preview@withjosephine.com",
    responses: [],
    createdAt: new Date(NOW - 10 * DAY).toISOString(),
    paidAt: new Date(NOW - 10 * DAY).toISOString(),
    deliveredAt: new Date(NOW - 3 * DAY).toISOString(),
    voiceNoteUrl: "https://images.withjosephine.com/preview/voice.mp3",
    pdfUrl: "https://images.withjosephine.com/preview/reading.pdf",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: "preview-user",
    isGift: false,
    purchaserUserId: "preview-user",
    recipientEmail: null,
    giftDeliveryMethod: null,
    giftSendAt: null,
    giftMessage: null,
    giftClaimTokenHash: null,
    giftClaimEmailFiredAt: null,
    giftClaimedAt: null,
    giftCancelledAt: null,
    giftClaimSentNowAt: null,
    giftClaimSentNowActor: null,
    giftClaimPriorAlarmAt: null,
    ...overrides,
  } as SubmissionRecord;
}

export const PREVIEW_SUBMISSION_ID = "preview-submission";

export const LISTEN_PREVIEW_STATES = [
  "delivered",
  "signIn",
  "checkEmail",
  "rested",
  "throttled",
  "assetTrouble",
  "expired",
] as const;

export type ListenPreviewState = (typeof LISTEN_PREVIEW_STATES)[number];

export const MY_READINGS_PREVIEW_STATES = ["list", "signIn", "checkEmail"] as const;
export type MyReadingsPreviewState = (typeof MY_READINGS_PREVIEW_STATES)[number];

export const MY_GIFTS_PREVIEW_STATES = ["list", "signIn", "checkEmail"] as const;
export type MyGiftsPreviewState = (typeof MY_GIFTS_PREVIEW_STATES)[number];

export const PREVIEW_READINGS_MIX: SubmissionRecord[] = [
  fixtureSubmission({
    _id: "preview-recent",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    deliveredAt: new Date(NOW - 3 * DAY).toISOString(),
  }),
  fixtureSubmission({
    _id: "preview-mid",
    reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$99" },
    deliveredAt: new Date(NOW - 45 * DAY).toISOString(),
  }),
  fixtureSubmission({
    _id: "preview-expired",
    reading: { slug: "akashic-records", name: "Akashic Records Reading", priceDisplay: "$79" },
    deliveredAt: new Date(NOW - 120 * DAY).toISOString(),
  }),
];

export const PREVIEW_GIFTS_MIX: SubmissionRecord[] = [
  fixtureSubmission({
    _id: "preview-gift-scheduled",
    isGift: true,
    purchaserUserId: "preview-purchaser",
    recipientUserId: null,
    recipientEmail: "recipient@example.com",
    giftDeliveryMethod: "scheduled",
    giftSendAt: new Date(NOW + 7 * DAY).toISOString(),
    giftMessage: "Thinking of you on your birthday.",
    deliveredAt: undefined,
  }),
  fixtureSubmission({
    _id: "preview-gift-self-send",
    isGift: true,
    purchaserUserId: "preview-purchaser",
    recipientUserId: null,
    recipientEmail: "friend@example.com",
    giftDeliveryMethod: "self_send",
    giftMessage: null,
    deliveredAt: undefined,
  }),
  fixtureSubmission({
    _id: "preview-gift-claimed",
    isGift: true,
    purchaserUserId: "preview-purchaser",
    recipientUserId: "preview-recipient",
    recipientEmail: "claimed@example.com",
    giftDeliveryMethod: "self_send",
    giftClaimedAt: new Date(NOW - 10 * DAY).toISOString(),
    deliveredAt: new Date(NOW - 3 * DAY).toISOString(),
  }),
];

function arrayParam<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

export function parseListenState(value: string | undefined): ListenPreviewState {
  return arrayParam(value, LISTEN_PREVIEW_STATES, "delivered");
}

export function parseMyReadingsState(value: string | undefined): MyReadingsPreviewState {
  return arrayParam(value, MY_READINGS_PREVIEW_STATES, "list");
}

export function parseMyGiftsState(value: string | undefined): MyGiftsPreviewState {
  return arrayParam(value, MY_GIFTS_PREVIEW_STATES, "list");
}
