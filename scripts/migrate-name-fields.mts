import fs from "node:fs";

import { type IdentifiedSanityDocumentStub } from "@sanity/client";

import { sanityWriteClient } from "./_lib/sanity-write-client.mts";

const env = fs.readFileSync(".env.local", "utf-8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.+)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}

const client = sanityWriteClient({ dataset: "production" });

const NAME_PATTERN = "^[A-Za-z\\u00C0-\\u017F'\\-\\s.]+$";
const NAME_PATTERN_OPTIONAL = "^[A-Za-z\\u00C0-\\u017F'\\-\\s.]*$";

const NEW_FIELDS: IdentifiedSanityDocumentStub[] = [
  {
    _id: "formField-firstName",
    _type: "formField",
    key: "first_name",
    label: "First name",
    type: "shortText",
    required: true,
    system: true,
    order: 41,
    validation: {
      minLength: 1,
      maxLength: 80,
      pattern: NAME_PATTERN,
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
  {
    _id: "formField-middleName",
    _type: "formField",
    key: "middle_name",
    label: "Middle name",
    type: "shortText",
    required: false,
    system: true,
    order: 42,
    helpText: "Optional",
    validation: {
      maxLength: 80,
      pattern: NAME_PATTERN_OPTIONAL,
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
  {
    _id: "formField-lastName",
    _type: "formField",
    key: "last_name",
    label: "Last name",
    type: "shortText",
    required: true,
    system: true,
    order: 43,
    validation: {
      minLength: 1,
      maxLength: 80,
      pattern: NAME_PATTERN,
      patternErrorMessage: "Please use letters only — no numbers or symbols.",
    },
  },
];

for (const field of NEW_FIELDS) {
  await client.createIfNotExists(field);
  console.log(`Ensured ${field._id}`);
}

await client
  .patch("formField-legalFullName")
  .set({ required: false })
  .commit()
  .catch(() => {
    console.log("(legacy formField-legalFullName not present — skipping demote)");
  });
console.log("Demoted formField-legalFullName.required → false");

const newRefs = [
  { _key: "formField-email", _type: "reference", _ref: "formField-email" },
  { _key: "formField-firstName", _type: "reference", _ref: "formField-firstName" },
  { _key: "formField-middleName", _type: "reference", _ref: "formField-middleName" },
  { _key: "formField-lastName", _type: "reference", _ref: "formField-lastName" },
];

await client
  .patch("formSection-page1-system")
  .set({
    fields: newRefs,
    marginaliaLabel: "Your name",
  })
  .commit();
console.log("Patched formSection-page1-system: fields swapped + marginaliaLabel updated");

console.log("\nDone.");
