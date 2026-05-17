// Restore the time-of-birth unknown-toggle field with the new `checkbox`
// type. The prior `formField-timeOfBirthUnknown` doc was modeled as
// `type: "consent"` and got swept by migrate-strip-consent-fields. Without
// it, the TimePicker's unknownToggle prop is undefined and customers who
// don't know their birth time can't submit Birth Chart / Soul Blueprint
// readings. This restores the doc + re-attaches it to formSection-birth.
//
// Idempotent: re-running after a clean run is a no-op.
//
// Run: pnpm tsx scripts/migrate-restore-time-unknown-checkbox-2026-05.ts <dataset>
// Default: production.

import { loadDotenv } from "./_lib/loadDotenv.mts";
import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

loadDotenv();

const dataset = process.argv[2] ?? "production";
const client = sanityWriteClient({ dataset });

const FIELD_ID = "formField-timeOfBirthUnknown";
const SECTION_ID = "formSection-birth";
const FIELD_KEY = "time_of_birth_unknown";
const FIELD_DOC = {
  _id: FIELD_ID,
  _type: "formField",
  key: FIELD_KEY,
  label: "I don't know my birth time",
  type: "checkbox",
  required: false,
  system: true,
  order: 75,
  appliesToServices: [
    { _type: "reference", _ref: "reading-soul-blueprint", _key: "reading-soul-blueprint" },
    { _type: "reference", _ref: "reading-birth-chart", _key: "reading-birth-chart" },
  ],
};

type SectionWithFieldRefs = {
  _id: string;
  fields: { _ref: string; _key: string }[] | null;
};

async function main() {
  console.log(`\nrestore-time-unknown-checkbox — dataset=${dataset}\n`);

  const existing = await client.fetch<{ _id: string; type: string } | null>(
    `*[_id == $id][0]{ _id, type }`,
    { id: FIELD_ID },
  );

  if (existing && existing.type === "checkbox") {
    console.log(`Field ${FIELD_ID} already restored as checkbox — nothing to do for the doc.`);
  } else if (existing) {
    console.log(`Field ${FIELD_ID} exists with type=${existing.type} — patching to checkbox.`);
    await client.patch(FIELD_ID).set({ type: "checkbox" }).commit();
  } else {
    console.log(`Creating ${FIELD_ID} with type=checkbox.`);
    await client.createIfNotExists(FIELD_DOC);
  }

  const section = await client.fetch<SectionWithFieldRefs | null>(
    `*[_id == $id][0]{ _id, "fields": fields[]{ _ref, _key } }`,
    { id: SECTION_ID },
  );

  if (!section) {
    console.warn(`Section ${SECTION_ID} not found — cannot attach reference.`);
    process.exit(2);
  }

  const fields = section.fields ?? [];
  const alreadyAttached = fields.some((ref) => ref._ref === FIELD_ID);
  if (alreadyAttached) {
    console.log(`Reference to ${FIELD_ID} already present in ${SECTION_ID} — nothing to do for the section.`);
    console.log(`\nrestore-time-unknown-checkbox complete.`);
    return;
  }

  const refKey = `ref-${FIELD_ID}`;
  const nextFields = [...fields, { _ref: FIELD_ID, _key: refKey, _type: "reference" }];
  console.log(`Attaching ${FIELD_ID} to ${SECTION_ID} (${nextFields.length} field refs total).`);
  await client.patch(SECTION_ID).set({ fields: nextFields }).commit();

  console.log(`\nrestore-time-unknown-checkbox complete.`);
}

main().catch((error) => {
  console.error("restore-time-unknown-checkbox crashed:", error);
  process.exit(1);
});
