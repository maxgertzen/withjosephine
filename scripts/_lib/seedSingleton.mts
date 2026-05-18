import { sanityWriteClient } from "./sanity-write-client.mts";

export async function seedSingletonFields(args: {
  docType: string;
  fields: Record<string, unknown>;
  logPrefix: string;
}): Promise<void> {
  const client = sanityWriteClient();
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  console.log(`[${args.logPrefix}] dataset=${dataset}`);
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }
  const doc = await client.fetch<{ _id: string } | null>(
    `*[_type == "${args.docType}"][0]{_id}`,
  );
  if (!doc) {
    console.warn(`[skip] no ${args.docType} singleton in this dataset.`);
    return;
  }
  await client.patch(doc._id).setIfMissing(args.fields).commit();
  console.log(
    `setIfMissing applied to ${doc._id} for: ${Object.keys(args.fields).join(", ")}.`,
  );
}
