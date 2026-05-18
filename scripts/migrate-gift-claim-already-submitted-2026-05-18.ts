import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const NEW_FIELDS = {
  alreadySubmittedHeading: "We have your answers — thank you.",
  alreadySubmittedBody:
    "Your reading is in my hands now. If something in what you sent needs a correction, just write to me at hello@withjosephine.com and I'll take care of it.",
} as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-gift-claim-already-submitted] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "giftClaimPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no giftClaimPage singleton in this dataset.");
    return;
  }
  await client.patch(doc._id).setIfMissing(NEW_FIELDS).commit();
  console.log(
    `setIfMissing applied to ${doc._id} for: ${Object.keys(NEW_FIELDS).join(", ")}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
