// Idempotent reconciliation for dex ekesibyy. Reading names are now bare
// ("Soul Blueprint" / "Birth Chart" / "Akashic Record"), and the email/page
// copy reads naturally by appending the word "reading" AFTER the {readingName}
// token in running sentences (e.g. "booking a {readingName} reading"). The
// defaults in src/data/defaults.ts were updated; these singletons are
// Sanity-wired ({ ...DEFAULTS, ...pickDefined(sanity) }), so any live override
// still carries the bare "{readingName}" form until this runs.
//
// For each target singleton it walks every copy field and rewrites the literal
// token "{readingName}" -> "{readingName} reading", but only where it is not
// already followed by " reading" (negative lookahead). Becky's other edits are
// preserved: only the token's immediate context changes, nothing is overwritten
// wholesale. Re-running is a no-op.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-readingname-append-reading-2026-06-16.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-readingname-append-reading-2026-06-16.ts

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { patchSingleton } from "./_lib/seedSingleton.mts";

// Singletons whose copy interpolates {readingName} in a running sentence.
// The standalone card title in each email is rendered from code (vars), not a
// Sanity copy field, so walking these docs only touches sentence contexts.
const TARGET_DOC_TYPES = [
  "emailOrderConfirmation",
  "emailRecipientIntakeReceived",
  "emailGiftPurchaseConfirmationSelfSend",
  "emailGiftPurchaseConfirmationScheduled",
  "emailGiftClaim",
  "emailGiftClaimReminder",
  "emailDay7Delivery",
  "giftIntakePage",
] as const;

const TOKEN_RE = /\{readingName\}(?! reading)/g;

function appendReading(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(TOKEN_RE, "{readingName} reading");
  }
  if (Array.isArray(value)) {
    return value.map(appendReading);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value)) {
      out[key] = appendReading(inner);
    }
    return out;
  }
  return value;
}

async function main(): Promise<void> {
  loadDotenv();
  console.log(`[migrate-readingname-append-reading] targets=${TARGET_DOC_TYPES.length}`);

  let patchedDocs = 0;
  let skipped = 0;
  let missing = 0;

  for (const docType of TARGET_DOC_TYPES) {
    type Doc = { _id: string } & Record<string, unknown>;
    const doc = await patchSingleton<Doc>({
      docType,
      projection: "",
      logPrefix: `migrate-readingname-append-reading:${docType}`,
      mutate: (patch, doc) => {
        const sets: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(doc)) {
          if (key.startsWith("_")) continue;
          const next = appendReading(value);
          if (JSON.stringify(next) !== JSON.stringify(value)) {
            sets[key] = next;
          }
        }
        if (Object.keys(sets).length === 0) {
          skipped += 1;
          return null;
        }
        patchedDocs += 1;
        console.log(
          `[migrate-readingname-append-reading:${docType}] patching fields: ${Object.keys(sets).join(", ")}`,
        );
        return patch.set(sets);
      },
    });
    if (!doc) missing += 1;
  }

  console.log(
    `[migrate-readingname-append-reading] summary: patched-docs=${patchedDocs} unchanged=${skipped} missing-doc=${missing}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
