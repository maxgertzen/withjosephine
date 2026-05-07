import fs from "node:fs";
import { createClient } from "@sanity/client";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

if (!process.env.SANITY_WRITE_TOKEN) {
  throw new Error("SANITY_WRITE_TOKEN missing in .env.local");
}

const dataset = process.argv[2] ?? "production";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const existing = await client.fetch(
  `*[_type == "bookingPage"][0]{ _id, whatsIncludedHeading, bookReadingCtaText }`,
);

if (!existing?._id) {
  console.log(`[${dataset}] No bookingPage doc found — schema initialValue will seed on first edit.`);
  process.exit(0);
}

const patch: Record<string, string> = {};
if (!existing.whatsIncludedHeading) patch.whatsIncludedHeading = "What’s included";
if (!existing.bookReadingCtaText) patch.bookReadingCtaText = "Book this Reading →";

if (Object.keys(patch).length === 0) {
  console.log(`[${dataset}] bookingPage already has both fields — no patch needed.`);
  process.exit(0);
}

await client.patch(existing._id).set(patch).commit();
console.log(`[${dataset}] Patched bookingPage:`, patch);
