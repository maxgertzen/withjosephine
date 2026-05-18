import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const client = sanityWriteClient();

const NEW_FIELDS = {
  giftPurchaserSelfSendSubheading:
    "Your gift link is ready in the email I just sent — share it with them whenever feels right.",
  giftPurchaserSelfSendBody:
    "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready — they'll claim from there.",
  giftPurchaserReadingLabel: "Your gift",
} as const;

async function main(): Promise<void> {
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[migrate-thank-you-gift-self-send] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "thankYouPage"][0]{_id}`,
  );
  if (!doc) {
    console.warn("[skip] no thankYouPage singleton in this dataset.");
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
