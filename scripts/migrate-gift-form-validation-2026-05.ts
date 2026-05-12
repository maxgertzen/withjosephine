// Adds the 10 new validation/error/timezone fields to the existing
// `bookingGiftForm` singleton. These were previously hard-coded inside
// GiftForm.tsx; Phase 5 Session 5 moves them to Sanity so Becky can soften
// the wording (especially around 422 anti-abuse responses + Turnstile
// failures) without a deploy.
//
// Idempotent: every field is set with `setIfMissing` so we never clobber
// Becky-edited values. Safe to re-run.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-form-validation-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-form-validation-2026-05.ts
import { createClient } from "@sanity/client";

import { BOOKING_GIFT_FORM_DEFAULTS } from "../src/data/defaults";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const NEW_FIELDS = [
  "firstNameRequiredError",
  "emailInvalidError",
  "recipientNameRequiredError",
  "recipientEmailRequiredError",
  "sendAtRequiredError",
  "consentRequiredError",
  "verificationError",
  "genericError",
  "networkError",
  "sendAtTimezoneHint",
] as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-gift-form-validation-2026-05] dataset=${dataset}`);
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
  const patch = client.patch(doc._id);
  const seed: Record<string, string> = {};
  for (const key of NEW_FIELDS) {
    seed[key] = BOOKING_GIFT_FORM_DEFAULTS[key];
  }
  await patch.setIfMissing(seed).commit();
  console.log(`Seeded ${NEW_FIELDS.length} fields (setIfMissing) on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
