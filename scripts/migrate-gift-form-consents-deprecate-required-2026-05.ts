// Strips the three deprecated consent-label fields from the `bookingGiftForm`
// singleton. Phase 1.5 moves these labels into source (GIFT_ART6_CONSENT_LABEL +
// COOLING_OFF_CONSENT_LABEL in `src/lib/compliance/intakeConsent.ts`) so the
// GDPR-mandatory consent UI cannot be misconfigured via the CMS. The third
// `termsConsentLabel` checkbox is dropped entirely — T&C bundles into the
// purchaser-scoped Art. 6 label.
//
// Idempotent: `unset` is a no-op when the field is already absent. Safe to
// re-run.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-form-consents-deprecate-required-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-form-consents-deprecate-required-2026-05.ts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const DEPRECATED_FIELDS = [
  "art6ConsentLabel",
  "coolingOffConsentLabel",
  "termsConsentLabel",
] as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-gift-form-consents-deprecate-required-2026-05] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "bookingGiftForm"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no bookingGiftForm singleton in this dataset.");
    return;
  }
  await client.patch(doc._id).unset([...DEPRECATED_FIELDS]).commit();
  console.log(
    `Unset ${DEPRECATED_FIELDS.length} deprecated consent-label fields on ${doc._id}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
