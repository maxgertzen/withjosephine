import fs from "node:fs";
import { createClient } from "@sanity/client";

import {
  EMAIL_GIFT_OPENED_DEFAULTS,
  EMAIL_GIFT_PURCHASE_DEFAULTS,
  EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
  EMAIL_GIFT_TO_RECIPIENT_DEFAULTS,
  EMAIL_READING_DELIVERY_DEFAULTS,
  GIFT_DEFAULTS,
  EMAIL_MAGIC_LINK_DEFAULTS,
  EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  EMAIL_PRIVACY_EXPORT_DEFAULTS,
  EMAIL_SHARED_SHELL_DEFAULTS,
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  NOT_FOUND_PAGE_DEFAULTS,
  UNDER_CONSTRUCTION_PAGE_DEFAULTS,
} from "../src/data/defaults";
import { stringToPortableTextBlocks } from "../src/lib/emails/portableTextBuild";
import { fillMissing } from "./_lib/fillMissing.mts";

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
  emailReadingDelivery: new Set([
    "bodyIntro",
    "bodyPostButton",
    "comfortLine",
    "signedInDisclosure",
    "accessWindowLine",
    "comfortFollowUp",
  ]),
  emailPrivacyExport: new Set(["bodyIntro", "bodyPostButton"]),
  emailMagicLink: new Set(["body"]),
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

const DEFAULTS_BY_TYPE: Record<string, object> = {
  listenPage: LISTEN_PAGE_DEFAULTS,
  magicLinkVerifyPage: MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  emailOrderConfirmation: EMAIL_ORDER_CONFIRMATION_DEFAULTS,
  emailReadingDelivery: EMAIL_READING_DELIVERY_DEFAULTS,
  emailMagicLink: EMAIL_MAGIC_LINK_DEFAULTS,
  emailPrivacyExport: EMAIL_PRIVACY_EXPORT_DEFAULTS,
  emailSharedShell: EMAIL_SHARED_SHELL_DEFAULTS,
  notFoundPage: NOT_FOUND_PAGE_DEFAULTS,
  underConstructionPage: UNDER_CONSTRUCTION_PAGE_DEFAULTS,
  giftSettings: GIFT_DEFAULTS,
  emailGiftPurchase: EMAIL_GIFT_PURCHASE_DEFAULTS,
  emailGiftToRecipient: EMAIL_GIFT_TO_RECIPIENT_DEFAULTS,
  emailGiftOpened: EMAIL_GIFT_OPENED_DEFAULTS,
  emailGiftRecipientConfirmation: EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
};

const NEW_IN_V1_21 = new Set([
  "giftSettings",
  "emailGiftPurchase",
  "emailGiftToRecipient",
  "emailGiftOpened",
  "emailGiftRecipientConfirmation",
]);

const types = Object.keys(DEFAULTS_BY_TYPE);
const existing = new Set(await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: types }));

const transaction = client.transaction();
for (const type of types) {
  const fields = Object.fromEntries(
    Object.entries(normalizePtFields({ _type: type, ...omitNullish(DEFAULTS_BY_TYPE[type]) })).filter(
      ([key]) => key !== "_type",
    ),
  );
  transaction.createIfNotExists({ _id: type, _type: type, ...(NEW_IN_V1_21.has(type) ? {} : fields) });
  if (NEW_IN_V1_21.has(type)) fillMissing(transaction, { _id: type, fields });
  const outcome = !existing.has(type)
    ? "created with defaults"
    : NEW_IN_V1_21.has(type)
      ? "exists, empty fields filled"
      : "exists, no changes";
  console.log(`[${dataset}] ${type}: ${outcome}`);
}
await transaction.commit();

console.log(`[${dataset}] Seed complete.`);
