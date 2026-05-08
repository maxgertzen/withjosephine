/**
 * One-time promote: copy editable content from the `staging` Sanity dataset
 * into `production`. Used to consolidate Becky's soft-launch edits (made in
 * staging while apex was parked) back to production-as-truth before apex
 * unparks.
 *
 * Behavior:
 * - Fetches every document whose `_type` is in PROMOTABLE_TYPES from staging.
 * - For each, calls `createOrReplace()` on the production client with the same
 *   `_id`, so re-runs are idempotent.
 * - Refuses to touch any type NOT in the explicit allowlist (notably
 *   `submission`, which holds customer PII and must NEVER be copied).
 * - Use --dry-run to print a summary without writing.
 *
 * Usage:
 *   pnpm tsx scripts/promote-staging-to-production.mts            # writes
 *   pnpm tsx scripts/promote-staging-to-production.mts --dry-run  # preview
 */
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

const dryRun = process.argv.includes("--dry-run");

const PROMOTABLE_TYPES = [
  // Singletons
  "siteSettings",
  "bookingPage",
  "bookingForm",
  "thankYouPage",
  "landingPage",
  "notFoundPage",
  "underConstructionPage",
  "theme",
  // Multi-doc content
  "reading",
  "testimonial",
  "faqItem",
  "legalPage",
  // Booking-form schema graph (referenced by bookingForm)
  "formSection",
  "formField",
] as const;

const FORBIDDEN_TYPES = new Set(["submission"]);

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const apiVersion = "2024-01-01";

const stagingClient = createClient({
  projectId,
  dataset: "staging",
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

const productionClient = createClient({
  projectId,
  dataset: "production",
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

type SanityDoc = { _id: string; _type: string; _rev?: string; _updatedAt?: string };

const filter = `_type in [${PROMOTABLE_TYPES.map((t) => `"${t}"`).join(", ")}]`;
const docs = await stagingClient.fetch<SanityDoc[]>(`*[${filter} && !(_id in path("drafts.**"))]`);

if (docs.length === 0) {
  console.log("[promote] No promotable documents found in staging.");
  process.exit(0);
}

console.log(`[promote] Found ${docs.length} documents in staging:`);
for (const doc of docs) {
  console.log(`  - ${doc._type}: ${doc._id}`);
}

const safetyChecked = docs.every((d) => !FORBIDDEN_TYPES.has(d._type));
if (!safetyChecked) {
  throw new Error("[promote] Safety check failed — forbidden type in batch.");
}

if (dryRun) {
  console.log("\n[promote] --dry-run: no writes performed.");
  process.exit(0);
}

let written = 0;
for (const doc of docs) {
  // Strip Sanity-managed metadata so production assigns its own _rev / timestamps.
  const { _rev, _updatedAt, ...clean } = doc;
  await productionClient.createOrReplace(clean as SanityDoc);
  written += 1;
  console.log(`[promote] wrote ${doc._type}/${doc._id}`);
}

console.log(`\n[promote] Done. ${written} documents written to production.`);
console.log(
  "\nNext: open Production workspace in Studio, review the imports, and publish anything still in draft.",
);
