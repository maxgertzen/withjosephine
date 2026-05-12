// Gift-flow copy migration: brings Sanity overrides into line with the
// current defaults in src/data/defaults.ts across four doctypes:
//
//   emailGiftPurchaseConfirmation.refundLine       — point at /my-gifts self-service,
//                                                    drop the false refund promise.
//   emailGiftPurchaseConfirmation.shareButtonLabel — sentence case.
//   emailGiftClaim.claimButtonLabel                — sentence case.
//   bookingGiftForm.antiAbuseCapBody               — warmer phrasing.
//   myGiftsPage.statusSentLabel                    — drop passive em-dash.
//   myGiftsPage.statusPreparingLabel               — privacy-respecting; honours
//                                                    locked decision that listened-state
//                                                    is private to the recipient.
//
// Each operation is independently idempotent: skip if the current value
// already matches the new lock; warn (don't fail) if the current value is
// neither the previous default nor the new lock (Becky may have customised).
//
// Run staging first, then production:
//   set -a && source .env.local && set +a && \
//     NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-gift-copy-2026-05.ts
//   set -a && source .env.local && set +a && \
//     pnpm tsx scripts/migrate-gift-copy-2026-05.ts
import { createClient } from "@sanity/client";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type Migration = {
  docType: string;
  field: string;
  previous: string;
  next: string;
};

const MIGRATIONS: Migration[] = [
  {
    docType: "emailGiftPurchaseConfirmation",
    field: "refundLine",
    previous:
      "If something changes before {recipientName} opens the link, write to me and we’ll arrange a full refund. After they’ve started their intake, the work is on its way and the reading is theirs.",
    next: "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at withjosephine.com/my-gifts.",
  },
  {
    docType: "emailGiftPurchaseConfirmation",
    field: "shareButtonLabel",
    previous: "OPEN GIFT LINK",
    next: "Share the link",
  },
  {
    docType: "emailGiftClaim",
    field: "claimButtonLabel",
    previous: "OPEN YOUR GIFT",
    next: "Open your gift",
  },
  {
    docType: "bookingGiftForm",
    field: "antiAbuseCapBody",
    previous:
      "We’re holding a gift for this person already. Please give them a moment to open it before sending another.",
    next: "There’s already a reading waiting for this person. Give them a quiet moment to open it before sending another.",
  },
  {
    docType: "myGiftsPage",
    field: "statusSentLabel",
    previous: "Sent — waiting for them to open it",
    next: "Sent — resting in their inbox",
  },
  {
    docType: "myGiftsPage",
    field: "statusPreparingLabel",
    previous: "They’re preparing their reading",
    next: "In Josephine’s hands",
  },
];

async function applyMigration(m: Migration): Promise<"updated" | "skipped" | "missing" | "drift"> {
  const doc = await client.fetch<{ _id: string; [k: string]: unknown } | null>(
    `*[_type == $docType][0]{_id, "${m.field}": ${m.field}}`,
    { docType: m.docType },
  );
  if (!doc) return "missing";
  const current = doc[m.field];
  if (current === m.next) return "skipped";
  if (current !== m.previous && current !== undefined && current !== null) {
    console.warn(
      `[drift] ${m.docType}.${m.field} on ${process.env.NEXT_PUBLIC_SANITY_DATASET || "production"} is neither previous nor next. Skipping. Current = ${JSON.stringify(current)}`,
    );
    return "drift";
  }
  await client.patch(doc._id).set({ [m.field]: m.next }).commit();
  return "updated";
}

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`migrating gift copy on dataset=${dataset}`);
  const results = await Promise.all(MIGRATIONS.map(applyMigration));
  for (const [i, result] of results.entries()) {
    const m = MIGRATIONS[i];
    console.log(`  ${m.docType}.${m.field}: ${result}`);
  }
  console.log("done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
