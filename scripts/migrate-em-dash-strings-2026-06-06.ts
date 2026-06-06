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
import { patchSingleton } from "./_lib/seedSingleton.mts";

const EM_DASH = "—";

type Defaults = Readonly<Record<string, unknown>>;

const asDefaults = (value: object): Defaults => value as Defaults;

const TARGETS: ReadonlyArray<{ docType: string; field: string; defaults: Defaults }> = [
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

async function main(): Promise<void> {
  loadDotenv();
  console.log(`[migrate-em-dash-strings] targets=${TARGETS.length}`);

  let patched = 0;
  let skipped = 0;
  let missing = 0;

  for (const target of TARGETS) {
    type Doc = { _id: string } & Record<string, unknown>;
    const doc = await patchSingleton<Doc>({
      docType: target.docType,
      projection: "",
      logPrefix: `migrate-em-dash-strings:${target.docType}.${target.field}`,
      mutate: (patch, doc) => {
        const current = doc[target.field];
        if (typeof current !== "string" || !current.includes(EM_DASH)) {
          skipped += 1;
          return null;
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
        patched += 1;
        return patch.set({ [target.field]: replacement });
      },
    });
    if (!doc) missing += 1;
  }

  console.log(
    `[migrate-em-dash-strings] summary: patched=${patched} skipped=${skipped} missing-doc=${missing}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
