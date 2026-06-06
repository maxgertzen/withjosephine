// Idempotent reconciliation of em-dash drift on five Sanity singletons.
// For each (docType, field) target the script reads the current prod
// value; when it still contains the em-dash codepoint (U+2014) the
// field is overwritten from src/data/defaults — our em-dash-free
// source of truth. Already-clean values are left alone.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-em-dash-strings-2026-06-06.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-em-dash-strings-2026-06-06.ts

import {
  GIFT_CLAIM_PAGE_DEFAULTS,
  GIFT_INTAKE_PAGE_DEFAULTS,
  LISTEN_PAGE_DEFAULTS,
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  MY_GIFTS_PAGE_DEFAULTS,
} from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const EM_DASH = "—";

type Defaults = Readonly<Record<string, unknown>>;

type Target = {
  docType: string;
  field: string;
  defaults: Defaults;
};

const asDefaults = (value: object): Defaults => value as Defaults;

const TARGETS: readonly Target[] = [
  { docType: "myGiftsPage", field: "statusSentLabel", defaults: asDefaults(MY_GIFTS_PAGE_DEFAULTS) },
  { docType: "myGiftsPage", field: "privacyNote", defaults: asDefaults(MY_GIFTS_PAGE_DEFAULTS) },
  { docType: "myGiftsPage", field: "editRecipientSelfSendIndicator", defaults: asDefaults(MY_GIFTS_PAGE_DEFAULTS) },
  { docType: "giftClaimPage", field: "seoTitle", defaults: asDefaults(GIFT_CLAIM_PAGE_DEFAULTS) },
  { docType: "giftClaimPage", field: "noTokenBody", defaults: asDefaults(GIFT_CLAIM_PAGE_DEFAULTS) },
  { docType: "giftClaimPage", field: "sessionExpiredBody", defaults: asDefaults(GIFT_CLAIM_PAGE_DEFAULTS) },
  { docType: "giftClaimPage", field: "alreadySubmittedHeading", defaults: asDefaults(GIFT_CLAIM_PAGE_DEFAULTS) },
  { docType: "giftIntakePage", field: "seoTitle", defaults: asDefaults(GIFT_INTAKE_PAGE_DEFAULTS) },
  { docType: "giftIntakePage", field: "headingWelcome", defaults: asDefaults(GIFT_INTAKE_PAGE_DEFAULTS) },
  { docType: "magicLinkVerifyPage", field: "confirmBody", defaults: asDefaults(MAGIC_LINK_VERIFY_PAGE_DEFAULTS) },
  { docType: "magicLinkVerifyPage", field: "restedBody", defaults: asDefaults(MAGIC_LINK_VERIFY_PAGE_DEFAULTS) },
  { docType: "listenPage", field: "restedBody", defaults: asDefaults(LISTEN_PAGE_DEFAULTS) },
];

type Counts = { patched: number; skipped: number; missing: number };

async function main(): Promise<void> {
  loadDotenv();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-em-dash-strings] dataset=${dataset} targets=${TARGETS.length}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  const client = sanityWriteClient();
  const counts: Counts = { patched: 0, skipped: 0, missing: 0 };

  for (const target of TARGETS) {
    const doc = await client.fetch<{ _id: string; [key: string]: unknown } | null>(
      `*[_type == $type][0]`,
      { type: target.docType },
    );
    if (!doc) {
      console.log(`[${target.docType}.${target.field}] missing-doc — skipped`);
      counts.missing += 1;
      continue;
    }
    const current = doc[target.field];
    if (typeof current !== "string" || !current.includes(EM_DASH)) {
      console.log(`[${target.docType}.${target.field}] no em-dash — skipped`);
      counts.skipped += 1;
      continue;
    }
    const replacement = target.defaults[target.field];
    if (typeof replacement !== "string") {
      throw new Error(
        `defaults missing string for ${target.docType}.${target.field}; refusing to patch.`,
      );
    }
    if (replacement.includes(EM_DASH)) {
      throw new Error(
        `defaults value for ${target.docType}.${target.field} contains em-dash; refusing to patch.`,
      );
    }
    await client.patch(doc._id).set({ [target.field]: replacement }).commit();
    console.log(`[${target.docType}.${target.field}] patched on ${doc._id}`);
    counts.patched += 1;
  }

  console.log(
    `[migrate-em-dash-strings] summary: patched=${counts.patched} skipped=${counts.skipped} missing-doc=${counts.missing}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
