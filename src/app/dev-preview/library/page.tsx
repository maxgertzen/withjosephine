import { notFound } from "next/navigation";

import {
  type LibraryTabId,
  LibraryView,
  type LibraryViewState,
} from "@/app/my-readings/_shared/LibraryView";
import { MY_GIFTS_PAGE_DEFAULTS, MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import type { SubmissionRecord } from "@/lib/page-previews/types";

const BASE_SUBMISSION: SubmissionRecord = {
  _id: "dev-preview-001",
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

const FIXTURE_READINGS: SubmissionRecord[] = [
  { ...BASE_SUBMISSION },
  {
    ...BASE_SUBMISSION,
    _id: "dev-preview-002",
    reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$99" },
    amountPaidCents: 9900,
    createdAt: "2026-03-02T09:00:00.000Z",
    paidAt: "2026-03-02T09:05:00.000Z",
    deliveredAt: "2026-03-09T14:00:00.000Z",
  },
];

const FIXTURE_GIFTS: SubmissionRecord[] = [
  {
    ...BASE_SUBMISSION,
    _id: "dev-preview-gift-001",
    isGift: true,
    reading: { slug: "akashic-record", name: "Akashic Record Reading", priceDisplay: "$79" },
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
    _id: "dev-preview-gift-002",
    isGift: true,
    reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$99" },
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
    _id: "dev-preview-gift-003",
    isGift: true,
    reading: { slug: "akashic-record", name: "Akashic Record Reading", priceDisplay: "$79" },
    amountPaidCents: 7900,
    recipientEmail: "sage@example.com",
    giftDeliveryMethod: "self_send",
    giftClaimedAt: "2026-04-20T11:00:00.000Z",
    responses: [
      { fieldKey: "recipientFirstName", fieldLabelSnapshot: "Recipient", fieldType: "string", value: "Sage" },
    ],
  },
];

type Scenario = "both" | "readings-only" | "gifts-only" | "empty" | "signIn" | "checkEmail";

function buildState(scenario: Scenario): LibraryViewState {
  if (scenario === "signIn") return { kind: "signIn" };
  if (scenario === "checkEmail") return { kind: "checkEmail" };
  if (scenario === "empty") return { kind: "list", readings: [], gifts: [] };
  if (scenario === "readings-only") return { kind: "list", readings: FIXTURE_READINGS, gifts: [] };
  if (scenario === "gifts-only") return { kind: "list", readings: [], gifts: FIXTURE_GIFTS };
  return { kind: "list", readings: FIXTURE_READINGS, gifts: FIXTURE_GIFTS };
}

function parseScenario(raw: string | undefined): Scenario {
  switch (raw) {
    case "both":
    case "readings-only":
    case "gifts-only":
    case "empty":
    case "signIn":
    case "checkEmail":
      return raw;
    default:
      return "both";
  }
}

function parseTab(raw: string | undefined): LibraryTabId {
  return raw === "gifts" ? "gifts" : "readings";
}

export default async function DevPreviewLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string; tab?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  const params = await searchParams;
  const scenario = parseScenario(params.scenario);
  const tab = parseTab(params.tab);
  return (
    <LibraryView
      state={buildState(scenario)}
      readingsCopy={MY_READINGS_PAGE_DEFAULTS}
      giftsCopy={MY_GIFTS_PAGE_DEFAULTS}
      defaultTab={tab}
    />
  );
}
