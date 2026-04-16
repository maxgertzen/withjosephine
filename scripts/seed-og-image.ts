/**
 * Seed seo.ogImage on all Sanity documents that have the field.
 *
 * Uploads public/images/Logo.png to Sanity as an asset (if not already
 * uploaded), then patches seo.ogImage on documents that don't have one.
 *
 * Uses setIfMissing — never overwrites a manually-set ogImage.
 *
 * Run:
 *   cd www
 *   set -a && source .env.local && set +a && pnpm tsx scripts/seed-og-image.ts
 */
import { createClient } from "@sanity/client";
import { readFileSync } from "fs";
import { resolve } from "path";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const LOGO_PATH = resolve(import.meta.dirname, "../public/images/Logo.png");

const TARGETS = [
  { type: "landingPage", label: "landingPage" },
  { type: "bookingPage", label: "bookingPage" },
  { type: "thankYouPage", label: "thankYouPage" },
  { type: "reading", label: "reading" },
] as const;

async function uploadAsset(): Promise<string> {
  console.log("Uploading Logo.png to Sanity...");
  const buffer = readFileSync(LOGO_PATH);
  const asset = await client.assets.upload("image", buffer, {
    filename: "og-image.png",
    contentType: "image/png",
  });
  console.log(`  Uploaded: ${asset._id}`);
  return asset._id;
}

async function main(): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is required");
  }
  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error("SANITY_WRITE_TOKEN is required");
  }

  const assetId = await uploadAsset();
  const ogImageRef = { _type: "image", asset: { _type: "reference", _ref: assetId } };

  const transaction = client.transaction();
  let patched = 0;

  for (const { type, label } of TARGETS) {
    const docs = await client.fetch<Array<{ _id: string; seo?: { ogImage?: unknown } }>>(
      `*[_type == "${type}"]{ _id, seo { ogImage } }`,
    );

    for (const doc of docs) {
      if (doc.seo?.ogImage) {
        console.log(`SKIP  ${label}(${doc._id}): ogImage already set`);
        continue;
      }

      transaction.patch(doc._id, (patch) =>
        patch.setIfMissing({ seo: {} }).set({ "seo.ogImage": ogImageRef }),
      );

      console.log(`FILL  ${label}(${doc._id}): seo.ogImage`);
      patched++;
    }
  }

  if (patched > 0) {
    await transaction.commit();
  }

  console.log(`\nDone. Patched ${patched} documents.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
