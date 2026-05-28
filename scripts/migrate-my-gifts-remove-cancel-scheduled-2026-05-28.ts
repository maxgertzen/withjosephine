// Phase 4 of architectural epic 23ctexvw (dex zgd1sjpu).
//
// Removes the 4 cancelScheduled* fields from the myGiftsPage singleton
// (destructive-cancel mechanism deleted). Also relabels
// flipToSelfSendCtaLabel from the old "Send the link myself instead" to the
// new "Cancel the schedule and send it myself" — but only if the current
// value still matches the old default (preserves any Becky-edited value).
//
// Idempotent: re-running mutates 0.
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx \
//     scripts/migrate-my-gifts-remove-cancel-scheduled-2026-05-28.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-my-gifts-remove-cancel-scheduled-2026-05-28.ts
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const REMOVED_FIELDS = [
  "cancelScheduledCtaLabel",
  "cancelScheduledConfirmCtaLabel",
  "cancelScheduledSendingLabel",
  "cancelScheduledSessionExpiredError",
] as const;

const OLD_FLIP_LABEL = "Send the link myself instead";
const NEW_FLIP_LABEL = "Cancel the schedule and send it myself";

const LOG_PREFIX = "migrate-my-gifts-remove-cancel-scheduled";

async function main(): Promise<void> {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[${LOG_PREFIX}] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<
    | {
        _id: string;
        flipToSelfSendCtaLabel?: string;
      }
    | null
  >(`*[_type == "myGiftsPage"][0]{_id, flipToSelfSendCtaLabel}`);
  if (!doc) {
    console.warn(`[${LOG_PREFIX}] no myGiftsPage singleton in this dataset.`);
    return;
  }

  let patch = client.patch(doc._id).unset([...REMOVED_FIELDS]);
  let labelChanged = false;
  if (doc.flipToSelfSendCtaLabel === OLD_FLIP_LABEL) {
    patch = patch.set({ flipToSelfSendCtaLabel: NEW_FLIP_LABEL });
    labelChanged = true;
  }
  await patch.commit();
  console.log(
    `[${LOG_PREFIX}] applied to ${doc._id}: unset=${REMOVED_FIELDS.join(",")}` +
      (labelChanged ? `, flipToSelfSendCtaLabel relabelled` : `, flipToSelfSendCtaLabel preserved`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
