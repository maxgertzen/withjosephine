// Idempotent reconciliation of the stale "your gifts page" anchor in the two
// gift-purchase-confirmation email refundLine fields. After the v1.4.0
// /my-gifts -> /my-readings unification the {myGiftsUrl} token resolves to the
// unified library, so the phrase was changed to "your library" in
// src/data/defaults.ts (dex i31g3i01). These emails are Sanity-wired
// ({ ...DEFAULTS, ...pickDefined(sanity) }), so any live override still carries
// the legacy phrase until this runs. For each singleton the script reads the
// current refundLine PortableText; only when it still contains "your gifts page"
// does it overwrite the field from src/data/defaults (our source of truth).
// Already-reconciled or unset values are left alone.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-confirmation-library-copy-2026-06-12.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-confirmation-library-copy-2026-06-12.ts

import {
  EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS,
  EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
} from "../src/data/defaults";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { patchSingleton } from "./_lib/seedSingleton.mts";

const LEGACY_PHRASE = "your gifts page";

const TARGETS: ReadonlyArray<{ docType: string; refundLine: unknown }> = [
  {
    docType: "emailGiftPurchaseConfirmationSelfSend",
    refundLine: EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS.refundLine,
  },
  {
    docType: "emailGiftPurchaseConfirmationScheduled",
    refundLine: EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS.refundLine,
  },
];

async function main(): Promise<void> {
  loadDotenv();
  console.log(`[migrate-gift-confirmation-library-copy] targets=${TARGETS.length}`);

  let patched = 0;
  let skipped = 0;
  let missing = 0;

  for (const target of TARGETS) {
    if (JSON.stringify(target.refundLine).includes(LEGACY_PHRASE)) {
      throw new Error(
        `defaults refundLine for ${target.docType} still contains "${LEGACY_PHRASE}"; refusing to patch.`,
      );
    }
    type Doc = { _id: string; refundLine?: unknown };
    const doc = await patchSingleton<Doc>({
      docType: target.docType,
      projection: "",
      logPrefix: `migrate-gift-confirmation-library-copy:${target.docType}.refundLine`,
      mutate: (patch, doc) => {
        if (!JSON.stringify(doc.refundLine ?? null).includes(LEGACY_PHRASE)) {
          skipped += 1;
          return null;
        }
        patched += 1;
        return patch.set({ refundLine: target.refundLine });
      },
    });
    if (!doc) missing += 1;
  }

  console.log(
    `[migrate-gift-confirmation-library-copy] summary: patched=${patched} skipped=${skipped} missing-doc=${missing}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
