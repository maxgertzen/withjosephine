import { EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS } from "../src/data/defaults";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

async function main(): Promise<void> {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[seed-email-recipient-intake-received] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  await client.createIfNotExists({
    _id: "emailRecipientIntakeReceived",
    _type: "emailRecipientIntakeReceived",
    ...EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS,
  });
  console.log("emailRecipientIntakeReceived singleton seeded (idempotent).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
