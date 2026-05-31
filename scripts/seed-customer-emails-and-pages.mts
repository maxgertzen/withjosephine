import fs from "node:fs";
import { createClient } from "@sanity/client";

import {
  EMAIL_DAY7_DELIVERY_DEFAULTS,
  EMAIL_GIFT_CLAIM_DEFAULTS,
  EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS,
  EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS,
  EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_MAGIC_LINK_LIBRARY_DEFAULTS,
  EMAIL_NEW_DEVICE_NOTICE_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
  EMAIL_SHARED_SHELL_DEFAULTS,
  STEP_UP_OTP_EMAIL_DEFAULTS,
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  MY_GIFTS_PAGE_DEFAULTS,
  MY_READINGS_PAGE_DEFAULTS,
  NOT_FOUND_PAGE_DEFAULTS,
  UNDER_CONSTRUCTION_PAGE_DEFAULTS,
} from "../src/data/defaults";
import { stringToPortableTextBlocks } from "../src/lib/emails/portableTextBuild";

// Bootstraps the 7 customer-facing singletons under "Customer emails & pages"
// into the Sanity dataset using their code-side defaults. Without this, Studio
// renders "Untitled" in the editor pane H1 for any never-published singleton
// because `useValuePreview` short-circuits when `editState.draft/published`
// are both undefined (`preview.prepare` never runs).
//
// `createIfNotExists` is idempotent: re-runs are no-ops once Becky has the
// docs in her dataset; Becky's edits are never clobbered.
//
// Run: pnpm tsx scripts/seed-customer-emails-and-pages.mts <dataset>
// Default dataset: production. Use "staging" for the staging dataset.

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

// Strip null/undefined values — Sanity rejects null on typed fields. Editors
// can set signOff explicitly via Studio once the doc exists.
function omitNullish<T extends object>(record: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out as Partial<T>;
}

const PT_FIELDS_BY_TYPE: Record<string, ReadonlySet<string>> = {
  emailOrderConfirmation: new Set(["body", "thanksLine", "timelineLine", "contactLine"]),
  emailRecipientIntakeReceived: new Set(["body", "thanksLine", "timelineLine", "contactLine"]),
  emailDay7Delivery: new Set([
    "bodyIntro",
    "bodyPostButton",
    "comfortLine",
    "signedInDisclosure",
    "accessWindowLine",
    "comfortFollowUp",
  ]),
  emailPrivacyExport: new Set([
    "bodyIntro",
    "bodyPostButton",
    "introLine",
    "contentsLine",
    "expiryLine",
  ]),
  emailMagicLink: new Set(["body"]),
  emailMagicLinkLibrary: new Set(["body"]),
  emailGiftClaim: new Set(["body", "claimUrlHelper", "bodyFirstSend", "bodyReminder", "reminderContactLine"]),
  emailGiftClaimReminder: new Set(["body"]),
  emailGiftPurchaseConfirmationSelfSend: new Set(["body", "shareUrlHelper", "refundLine"]),
  emailGiftPurchaseConfirmationScheduled: new Set(["body", "refundLine"]),
  emailNewDeviceNotice: new Set(["bodyIntro", "bodyPostButton"]),
};

function isPortableTextArray(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry && typeof entry === "object" && (entry as { _type?: string })._type === "block",
    )
  );
}

function normalizePtFields<T extends Record<string, unknown>>(seed: T): T {
  const type = seed._type;
  if (typeof type !== "string") return seed;
  const ptFields = PT_FIELDS_BY_TYPE[type];
  if (!ptFields) return seed;
  const out: Record<string, unknown> = { ...seed };
  for (const field of ptFields) {
    const value = out[field];
    if (value == null || isPortableTextArray(value)) continue;
    if (typeof value === "string") {
      out[field] = value.trim().length === 0 ? [] : stringToPortableTextBlocks(value);
    } else if (Array.isArray(value)) {
      const joined = value.filter((v) => typeof v === "string").join("\n\n");
      out[field] = joined.trim().length === 0 ? [] : stringToPortableTextBlocks(joined);
    }
  }
  return out as T;
}

const SEEDS = [
  { _id: "listenPage", _type: "listenPage", ...omitNullish(LISTEN_PAGE_DEFAULTS) },
  { _id: "myReadingsPage", _type: "myReadingsPage", ...omitNullish(MY_READINGS_PAGE_DEFAULTS) },
  { _id: "myGiftsPage", _type: "myGiftsPage", ...omitNullish(MY_GIFTS_PAGE_DEFAULTS) },
  {
    _id: "magicLinkVerifyPage",
    _type: "magicLinkVerifyPage",
    ...omitNullish(MAGIC_LINK_VERIFY_PAGE_DEFAULTS),
  },
  {
    _id: "emailOrderConfirmation",
    _type: "emailOrderConfirmation",
    ...omitNullish(EMAIL_ORDER_CONFIRMATION_DEFAULTS),
  },
  {
    _id: "emailDay7Delivery",
    _type: "emailDay7Delivery",
    ...omitNullish(EMAIL_DAY7_DELIVERY_DEFAULTS),
  },
  { _id: "emailMagicLink", _type: "emailMagicLink", ...omitNullish(EMAIL_MAGIC_LINK_DEFAULTS) },
  {
    _id: "emailMagicLinkLibrary",
    _type: "emailMagicLinkLibrary",
    ...omitNullish(EMAIL_MAGIC_LINK_LIBRARY_DEFAULTS),
  },
  {
    _id: "emailGiftClaim",
    _type: "emailGiftClaim",
    ...omitNullish(EMAIL_GIFT_CLAIM_DEFAULTS),
  },
  {
    _id: "emailGiftClaimReminder",
    _type: "emailGiftClaimReminder",
    ...omitNullish(EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS),
  },
  {
    _id: "emailGiftPurchaseConfirmationSelfSend",
    _type: "emailGiftPurchaseConfirmationSelfSend",
    ...omitNullish(EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS),
  },
  {
    _id: "emailGiftPurchaseConfirmationScheduled",
    _type: "emailGiftPurchaseConfirmationScheduled",
    ...omitNullish(EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS),
  },
  {
    _id: "emailRecipientIntakeReceived",
    _type: "emailRecipientIntakeReceived",
    ...omitNullish(EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS),
  },
  {
    _id: "emailPrivacyExport",
    _type: "emailPrivacyExport",
    ...omitNullish(EMAIL_PRIVACY_EXPORT_DEFAULTS),
  },
  {
    _id: "emailSharedShell",
    _type: "emailSharedShell",
    ...omitNullish(EMAIL_SHARED_SHELL_DEFAULTS),
  },
  {
    _id: "emailStepUpOtp",
    _type: "emailStepUpOtp",
    ...omitNullish(STEP_UP_OTP_EMAIL_DEFAULTS),
  },
  {
    _id: "emailNewDeviceNotice",
    _type: "emailNewDeviceNotice",
    ...omitNullish(EMAIL_NEW_DEVICE_NOTICE_DEFAULTS),
  },
  {
    _id: "notFoundPage",
    _type: "notFoundPage",
    ...omitNullish(NOT_FOUND_PAGE_DEFAULTS),
  },
  {
    _id: "underConstructionPage",
    _type: "underConstructionPage",
    ...omitNullish(UNDER_CONSTRUCTION_PAGE_DEFAULTS),
  },
];

for (const seed of SEEDS) {
  const normalized = normalizePtFields(seed as Record<string, unknown>);
  const result = await client.createIfNotExists(normalized as never);
  const created = result._createdAt === result._updatedAt;
  console.log(
    `[${dataset}] ${seed._type}: ${created ? "created with defaults" : "already exists, no changes"}`,
  );
}

console.log(`[${dataset}] Seed complete.`);
