import type { ListenViewState } from "@/app/(authed)/listen/[id]/ListenView";
import type { MyReadingsViewProps } from "@/app/(authed)/my-readings/MyReadingsView";
import type { VerifyPageViewState } from "@/app/auth/verify/VerifyPageView";
import type { MyGiftsViewProps } from "@/app/my-gifts/MyGiftsView";

import type { GiftIntakePagePreviewState } from "./GiftIntakePagePreview";
import type { SubmissionRecord } from "./types";

const BASE_SUBMISSION: SubmissionRecord = {
  _id: "preview-submission-001",
  status: "paid",
  email: "preview@withjosephine.com",
  responses: [],
  createdAt: "2026-04-10T12:00:00.000Z",
  paidAt: "2026-04-10T12:05:00.000Z",
  deliveredAt: "2026-04-17T15:30:00.000Z",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: 17900,
  amountPaidCurrency: "USD",
  recipientUserId: null,
  isGift: false,
  purchaserUserId: null,
  purchaserTimeZone: null,
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
};

const READING_BIRTH_CHART = {
  slug: "birth-chart",
  name: "Birth Chart Reading",
  priceDisplay: "$99",
} as const;

const READING_AKASHIC = {
  slug: "akashic-record",
  name: "Akashic Record Reading",
  priceDisplay: "$79",
} as const;

export const LISTEN_FIXTURES: Record<string, ListenViewState> = {
  delivered: {
    kind: "delivered",
    readingName: "Soul Blueprint",
    recipientName: "Bob",
    voiceNoteAudioPath: "/preview-fixture/voice-note.m4a",
    pdfDownloadPath: "/preview-fixture/reading.pdf",
    showWelcomeRibbon: true,
  },
  signIn: { kind: "signIn", submissionId: "preview-submission-001" },
  checkEmail: { kind: "checkEmail", submissionId: "preview-submission-001" },
  rested: { kind: "rested", submissionId: "preview-submission-001" },
  throttled: { kind: "throttled", submissionId: "preview-submission-001" },
  assetTrouble: { kind: "assetTrouble", submissionId: "preview-submission-001" },
  expired: { kind: "expired", submissionId: "preview-submission-001" },
};

export const MY_READINGS_FIXTURES: Record<string, MyReadingsViewProps["state"]> = {
  "list-populated": {
    kind: "list",
    readings: [
      { ...BASE_SUBMISSION },
      {
        ...BASE_SUBMISSION,
        _id: "preview-submission-002",
        reading: READING_BIRTH_CHART,
        amountPaidCents: 9900,
        createdAt: "2026-03-02T09:00:00.000Z",
        paidAt: "2026-03-02T09:05:00.000Z",
        deliveredAt: "2026-03-09T14:00:00.000Z",
      },
    ],
  },
  "list-empty": { kind: "list", readings: [] },
  signIn: { kind: "signIn" },
  checkEmail: { kind: "checkEmail" },
};

export const MY_GIFTS_FIXTURES: Record<string, MyGiftsViewProps["state"]> = {
  "list-populated": {
    kind: "list",
    gifts: [
      {
        ...BASE_SUBMISSION,
        _id: "preview-gift-001",
        isGift: true,
        reading: READING_AKASHIC,
        amountPaidCents: 7900,
        recipientEmail: "river@example.com",
        giftDeliveryMethod: "scheduled",
        giftSendAt: "2026-12-12T17:00:00.000Z",
        deliveredAt: undefined,
        responses: [
          { fieldKey: "recipientFirstName", fieldLabelSnapshot: "Recipient", fieldType: "string", value: "River" },
        ],
      },
      {
        ...BASE_SUBMISSION,
        _id: "preview-gift-002",
        isGift: true,
        reading: READING_BIRTH_CHART,
        amountPaidCents: 9900,
        recipientEmail: "iris@example.com",
        giftDeliveryMethod: "self_send",
        giftSendAt: null,
        deliveredAt: undefined,
        responses: [
          { fieldKey: "recipientFirstName", fieldLabelSnapshot: "Recipient", fieldType: "string", value: "Iris" },
        ],
      },
      {
        ...BASE_SUBMISSION,
        _id: "preview-gift-003",
        isGift: true,
        reading: READING_AKASHIC,
        amountPaidCents: 7900,
        recipientEmail: "sage@example.com",
        giftDeliveryMethod: "self_send",
        giftClaimedAt: "2026-04-20T11:00:00.000Z",
        responses: [
          { fieldKey: "recipientFirstName", fieldLabelSnapshot: "Recipient", fieldType: "string", value: "Sage" },
        ],
      },
    ],
  },
  "list-empty": { kind: "list", gifts: [] },
  signIn: { kind: "signIn" },
  checkEmail: { kind: "checkEmail" },
};

export type GiftClaimFixtureKey = "no-token" | "invalid" | "expired";

export const GIFT_CLAIM_FIXTURE_KEYS: GiftClaimFixtureKey[] = [
  "no-token",
  "invalid",
  "expired",
];

export const VERIFY_FIXTURES: Record<string, VerifyPageViewState> = {
  confirm: { kind: "confirm", token: "preview-token", next: "/my-readings" },
  rested: { kind: "rested" },
};

export const GIFT_INTAKE_FIXTURES: Record<string, GiftIntakePagePreviewState> = {
  welcome: { kind: "welcome" },
  return: { kind: "return" },
};

export const GIFT_INTAKE_FIXTURE_READING_NAME = "Soul Blueprint";

export const PREVIEW_SURFACES = [
  "listen",
  "my-readings",
  "my-gifts",
  "gift-claim",
  "magic-link-verify",
  "gift-intake",
] as const;
export type PreviewSurface = (typeof PREVIEW_SURFACES)[number];

export function previewStateKeysFor(surface: PreviewSurface): string[] {
  if (surface === "listen") return Object.keys(LISTEN_FIXTURES);
  if (surface === "my-readings") return Object.keys(MY_READINGS_FIXTURES);
  if (surface === "my-gifts") return Object.keys(MY_GIFTS_FIXTURES);
  if (surface === "gift-claim") return GIFT_CLAIM_FIXTURE_KEYS;
  if (surface === "magic-link-verify") return Object.keys(VERIFY_FIXTURES);
  return Object.keys(GIFT_INTAKE_FIXTURES);
}
