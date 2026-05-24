import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const OLD_HEADING = "Thank you. Your reading is in my hands now.";
const NEW_HEADING = "Thank you, {recipientName}. Your reading is in my hands now.";

async function main(): Promise<void> {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-thank-you-gift-recipient-name] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string; giftRecipientHeading?: string } | null>(
    `*[_type == "thankYouPage"][0]{_id, giftRecipientHeading}`,
  );
  if (!doc) {
    console.warn("[skip] no thankYouPage singleton in this dataset.");
    return;
  }
  const current = doc.giftRecipientHeading;
  const eligible = current === undefined || current === null || current === OLD_HEADING;
  if (!eligible) {
    console.log(
      `[skip] giftRecipientHeading is hand-edited; leaving as-is. ` +
        `Current value: ${JSON.stringify(current)}`,
    );
    return;
  }
  await client.patch(doc._id).set({ giftRecipientHeading: NEW_HEADING }).commit();
  console.log(
    `Updated giftRecipientHeading on ${doc._id} to include {recipientName} placeholder. ` +
      `Previous value: ${JSON.stringify(current)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
