import fs from "node:fs";
import { createClient } from "@sanity/client";

// Cleans orphan field VALUES from production / staging Sanity documents.
// Schema deletions (in feat/csp-nonce-and-audits + PR #85) removed field
// definitions but Sanity preserves orphan values, which Studio surfaces as
// "Unknown fields found" yellow warnings on each affected doc.
//
// Run after: pnpm tsx scripts/cleanup-orphan-field-values.mts <dataset>
// Default dataset: production. Use "staging" for the staging dataset.

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
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

// Maps document type → orphan field paths to unset.
const ORPHANS = {
  // Removed in feat/csp-nonce-and-audits (audit pass 1).
  // bookingForm: consentBlock + nested rows + hairlineBeforeKey + swapToastCopy.
  // thankYouPage: heroLine + body + signOff.
  // Plus removed in PR #85 (audit pass 2).
  // bookingPage: emailLabel + emailDisclaimer + securityNote + closingMessage.
  // bookingForm: title + intro + description + confirmationMessage.
  // thankYouPage: steps.
  bookingForm: [
    "consentBlock",
    "swapToastCopy",
    "title",
    "intro",
    "description",
    "confirmationMessage",
  ],
  bookingPage: ["emailLabel", "emailDisclaimer", "securityNote", "closingMessage"],
  thankYouPage: ["heroLine", "body", "signOff", "steps"],
} as const satisfies Record<string, readonly string[]>;

for (const [docType, paths] of Object.entries(ORPHANS)) {
  const docId = await client.fetch<string | null>(`*[_type == $type][0]._id`, { type: docType });
  if (!docId) {
    console.log(`[${dataset}] No ${docType} doc found — skipping.`);
    continue;
  }
  await client.patch(docId).unset([...paths]).commit();
  console.log(`[${dataset}] ${docType}: unset orphan paths [${paths.join(", ")}] on ${docId}.`);
}

console.log(`[${dataset}] Cleanup done.`);
