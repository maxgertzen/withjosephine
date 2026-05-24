import fs from "node:fs";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const datasetArg = process.argv[2];
if (!datasetArg) {
  console.error("Usage: pnpm exec tsx scripts/migrate-email-bodies-to-portable-text-2026-05.mts <staging|production>");
  process.exit(1);
}

const client = sanityWriteClient({ dataset: datasetArg });

// Map of {singletonId: fieldNames[]} where fieldNames are the fields converted
// from `type: "text"` (plain string) to `type: "array"` of `block` (Portable
// Text) in this PR.
const TARGETS: Record<string, string[]> = {
  emailOrderConfirmation: ["thanksLine", "timelineLine", "contactLine"],
  emailRecipientIntakeReceived: ["thanksLine", "timelineLine", "contactLine"],
  emailDay7Delivery: ["comfortLine", "signedInDisclosure", "comfortFollowUp"],
  emailMagicLink: ["body"], // already array; each string item becomes one block
  emailGiftPurchaseConfirmation: [
    "detailLineSelfSend",
    "detailLineScheduled",
    "shareUrlHelper",
    "refundLine",
  ],
  emailGiftClaim: ["bodyFirstSend", "bodyReminder", "claimUrlHelper", "reminderContactLine"],
  emailPrivacyExport: ["introLine", "contentsLine", "expiryLine"],
};

function hashKey(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).padStart(8, "0");
}

function stringToBlock(text: string) {
  const key = hashKey(text);
  return {
    _type: "block",
    _key: key,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `${key}-s0`, text, marks: [] }],
  };
}

function alreadyConverted(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) => entry && typeof entry === "object" && (entry as { _type?: string })._type === "block",
    )
  );
}

let mutated = 0;
let noop = 0;
const failed: Array<{ id: string; field: string; reason: string }> = [];

for (const [docId, fields] of Object.entries(TARGETS)) {
  const doc = await client.getDocument(docId);
  if (!doc) {
    failed.push({ id: docId, field: "(doc)", reason: "document does not exist on this dataset" });
    continue;
  }
  const patches: Record<string, unknown> = {};
  for (const field of fields) {
    const current = (doc as Record<string, unknown>)[field];
    if (current == null) {
      // empty field — leave alone; schema initialValue is gone, Studio will show empty
      continue;
    }
    if (alreadyConverted(current)) {
      noop += 1;
      continue;
    }
    if (typeof current === "string") {
      patches[field] = [stringToBlock(current)];
    } else if (Array.isArray(current) && current.every((entry) => typeof entry === "string")) {
      patches[field] = (current as string[]).map(stringToBlock);
    } else {
      failed.push({ id: docId, field, reason: `unexpected type ${typeof current}` });
    }
  }
  if (Object.keys(patches).length === 0) {
    if (failed.find((f) => f.id === docId)) continue;
    console.log(`[${docId}] all target fields already Portable Text — noop`);
    continue;
  }
  await client.patch(docId).set(patches).commit();
  mutated += 1;
  console.log(`[${docId}] migrated fields: ${Object.keys(patches).join(", ")}`);
}

console.log(`\nDone. ${mutated} docs mutated, ${noop} field(s) already-converted, ${failed.length} failed.`);
if (failed.length > 0) {
  console.log("Failures:");
  for (const f of failed) console.log(`  - ${f.id}.${f.field}: ${f.reason}`);
  process.exit(2);
}
