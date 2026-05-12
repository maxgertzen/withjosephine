// Seeds the 14 new `myGiftsPage` fields introduced in Phase 5 Session 5:
// the edit-recipient drawer copy, per-action loading + cancel labels, the
// flip-confirm copy, the resend-link rate-limit + sending labels, and the
// 3 action-error variants (generic / network / closed).
//
// All in-flight button labels ("Saving…", "Switching…", "Sending…") and
// the 422 / 429 / 409 / network error strings move from hard-coded JSX to
// Sanity here so Becky can tune copy without a deploy. Closes GAP-3 from
// the Session 4 self-review.
//
// Idempotent: uses setIfMissing so Becky-edited values are preserved.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-my-gifts-actions-copy.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-my-gifts-actions-copy.ts
import { createClient } from "@sanity/client";

import { MY_GIFTS_PAGE_DEFAULTS } from "../src/data/defaults";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const NEW_FIELDS = [
  "editRecipientFormTitle",
  "editRecipientFormRecipientNameLabel",
  "editRecipientFormRecipientEmailLabel",
  "editRecipientFormSendAtLabel",
  "editRecipientSaveButtonLabel",
  "editRecipientSavingLabel",
  "editRecipientCancelButtonLabel",
  "flipConfirmCtaLabel",
  "flipSwitchingLabel",
  "resendSendingLabel",
  "resendThrottledMessage",
  "actionGenericError",
  "actionNetworkError",
  "actionClosedError",
] as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-my-gifts-actions-copy] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "myGiftsPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no myGiftsPage singleton in this dataset.");
    return;
  }
  const seed: Record<string, string> = {};
  for (const key of NEW_FIELDS) seed[key] = MY_GIFTS_PAGE_DEFAULTS[key];
  await client.patch(doc._id).setIfMissing(seed).commit();
  console.log(`Seeded ${NEW_FIELDS.length} fields (setIfMissing) on ${doc._id}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
