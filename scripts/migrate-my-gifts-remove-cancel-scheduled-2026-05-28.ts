// Phase 4 of architectural epic 23ctexvw (dex zgd1sjpu).
//
// Removes the 4 cancelScheduled* fields from the myGiftsPage singleton
// (destructive-cancel mechanism deleted). Also relabels
// flipToSelfSendCtaLabel from the old "Send the link myself instead" to the
// new "Cancel the schedule and send it myself", but only if the current
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
import { patchSingleton } from "./_lib/seedSingleton.mts";

const REMOVED_FIELDS = [
  "cancelScheduledCtaLabel",
  "cancelScheduledConfirmCtaLabel",
  "cancelScheduledSendingLabel",
  "cancelScheduledSessionExpiredError",
] as const;

const OLD_FLIP_LABEL = "Send the link myself instead";
const NEW_FLIP_LABEL = "Cancel the schedule and send it myself";

const LOG_PREFIX = "migrate-my-gifts-remove-cancel-scheduled";

type MyGiftsProjection = {
  _id: string;
  flipToSelfSendCtaLabel?: string;
};

async function main(): Promise<void> {
  let labelChanged = false;
  const doc = await patchSingleton<MyGiftsProjection>({
    docType: "myGiftsPage",
    projection: "{_id, flipToSelfSendCtaLabel}",
    logPrefix: LOG_PREFIX,
    mutate: (patch, projected) => {
      let next = patch.unset([...REMOVED_FIELDS]);
      if (projected.flipToSelfSendCtaLabel === OLD_FLIP_LABEL) {
        next = next.set({ flipToSelfSendCtaLabel: NEW_FLIP_LABEL });
        labelChanged = true;
      }
      return next;
    },
  });
  if (!doc) return;
  console.log(
    `[${LOG_PREFIX}] applied to ${doc._id}: unset=${REMOVED_FIELDS.join(",")}` +
      (labelChanged ? `, flipToSelfSendCtaLabel relabelled` : `, flipToSelfSendCtaLabel preserved`),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
