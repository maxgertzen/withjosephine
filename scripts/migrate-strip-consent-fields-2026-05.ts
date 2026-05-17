// Phase 1 P1.12 — strip deprecated consent-type fields from bookingForm.
//
// After D-3 removes "consent" from the formField type enum, any existing
// formField documents with `type: "consent"` become stranded values: the
// renderer filters them out (IntakeForm.tsx, line ~749), the schema skips
// them (submissionSchema.ts), and Studio surfaces a deprecation warning on
// the type dropdown. This script either deletes the orphan field documents
// or rewrites them to a non-consent type, whichever is configured below.
//
// Default behavior: DELETE the consent-type formField documents. Their
// references in formSection.fields[] are also dropped from the section.
// Idempotent: re-running after a clean run is a no-op.
//
// Run: pnpm tsx scripts/migrate-strip-consent-fields-2026-05.ts <dataset>
// Default: production. Use "staging" first; promote to production after
// Becky verifies Studio behavior.

import fs from "node:fs";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

for (const filename of [".env.local", ".env"]) {
  try {
    const raw = fs.readFileSync(filename, "utf-8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "");
      }
    }
    break;
  } catch {
    // Rely on process.env.
  }
}

const dataset = process.argv[2] ?? "production";
const client = sanityWriteClient({ dataset });

type ConsentField = {
  _id: string;
  key: string;
  label: string | null;
};

type SectionWithFieldRefs = {
  _id: string;
  sectionTitle: string;
  fields: { _ref: string; _key: string }[];
};

async function main() {
  console.log(`\nstrip-consent-fields — dataset=${dataset}\n`);

  const consentFields = await client.fetch<ConsentField[]>(
    `*[_type == "formField" && type == "consent"]{ _id, key, label }`,
  );

  if (consentFields.length === 0) {
    console.log("No consent-type formField documents — nothing to do.");
    return;
  }

  console.log(`Found ${consentFields.length} consent-type formField(s):`);
  for (const f of consentFields) {
    console.log(`  - ${f._id} | key=${f.key} | label="${f.label ?? ""}"`);
  }

  const consentIds = new Set(consentFields.map((f) => f._id));

  // Detach references from every formSection.fields array.
  const sections = await client.fetch<SectionWithFieldRefs[]>(
    `*[_type == "formSection"]{
       _id,
       sectionTitle,
       "fields": fields[]{ _ref, _key }
     }`,
  );

  let detachedCount = 0;
  for (const section of sections) {
    const keptFields = section.fields.filter((ref) => !consentIds.has(ref._ref));
    if (keptFields.length === section.fields.length) continue;
    const droppedCount = section.fields.length - keptFields.length;
    console.log(
      `  detaching ${droppedCount} consent ref(s) from section "${section.sectionTitle}" (${section._id})`,
    );
    await client.patch(section._id).set({ fields: keptFields }).commit();
    detachedCount += droppedCount;
  }

  // Now safe to delete the orphan formField documents.
  for (const field of consentFields) {
    console.log(`  deleting formField ${field._id} (key=${field.key})`);
    await client.delete(field._id);
  }

  console.log(
    `\nstrip-consent-fields complete — detached ${detachedCount} ref(s), deleted ${consentFields.length} field doc(s).`,
  );
}

main().catch((error) => {
  console.error("strip-consent-fields crashed:", error);
  process.exit(1);
});
