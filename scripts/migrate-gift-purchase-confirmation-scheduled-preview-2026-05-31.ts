import fs from "node:fs";
import { createClient } from "@sanity/client";

// Refines Becky's prod-edited preview text on emailGiftPurchaseConfirmationScheduled.
// Becky edited the preview to "You don't need to do anything else." (warm,
// hands-off). After PR #214 / Phase 4 of epic 23ctexvw the purchaser CAN still
// manage the scheduled gift (edit recipient name / email / send date) from
// /my-readings before the email fires; the current preview misleads.
//
// This migration ONLY rewrites the preview when it matches the exact known
// misaligned text. If Becky has already updated it (or has a different
// editorial choice), it skips. Re-runs are idempotent.
//
// Target text falls back to the code default
// (EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS.preview) which already
// surfaces the send-at date naturally.
//
// Run: pnpm tsx scripts/migrate-gift-purchase-confirmation-scheduled-preview-2026-05-31.ts <dataset>
// Default dataset: staging.

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "staging";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const DOC_ID = "emailGiftPurchaseConfirmationScheduled";
const OLD_TEXT = "You don't need to do anything else.";
const NEW_TEXT = "We'll send it to {recipientName} on {sendAtDisplay}.";

async function main(): Promise<void> {
  console.log(`[migrate-scheduled-preview] dataset=${dataset}`);

  const doc = await client.fetch<{ _id: string; preview?: string } | null>(
    `*[_id == $id][0]{_id, preview}`,
    { id: DOC_ID },
  );

  if (!doc) {
    console.warn(`[skip] no ${DOC_ID} singleton in dataset ${dataset}.`);
    return;
  }

  if (doc.preview !== OLD_TEXT) {
    console.log(
      `[skip] preview text already differs from the misaligned phrase; leaving as-is. Current: ${JSON.stringify(doc.preview ?? null)}`,
    );
    return;
  }

  await client.patch(doc._id).set({ preview: NEW_TEXT }).commit();
  console.log(
    `[ok] ${DOC_ID}.preview updated: ${JSON.stringify(OLD_TEXT)} -> ${JSON.stringify(NEW_TEXT)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
