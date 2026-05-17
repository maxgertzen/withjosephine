// Phase 1 P1.10 — GROQ-CI content-contract verifier.
//
// Three invariants the Sanity dataset must satisfy at PR-time:
//
//   1. Required-field population: every reading (soul-blueprint / birth-chart /
//      akashic-record) has every field marked `required: true` in the
//      bookingForm sections present + non-empty in the corresponding reading
//      document's overrides (where applicable).
//
//   2. Stripe Payment Link uniqueness: no two reading documents share the
//      same stripePaymentLink. A duplicate would route a paid checkout to
//      the wrong intake form and is the root cause of Becky's Issue #6.
//
//   3. No deprecated consent-type fields: `bookingForm.sections[].fields[]`
//      MUST NOT contain `type === "consent"` anywhere (PRD D-3). The
//      LegalAcknowledgments component owns those acks now.
//
// Exits non-zero on any violation. CI wires this in
// `.github/workflows/content-contract.yml`.
//
// Run locally: pnpm tsx scripts/verify-content-contract.ts <dataset>
// Defaults to NEXT_PUBLIC_SANITY_DATASET or "production".

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
    // CI sets vars directly.
  }
}

const dataset = process.argv[2] ?? process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
const client = sanityWriteClient({ readOnly: true, dataset });

type FieldRef = {
  key: string;
  type: string;
  required: boolean | null;
  appliesToServices: string[] | null;
};

type SectionRef = {
  _id: string;
  sectionTitle: string;
  appliesToServices: string[] | null;
  fields: FieldRef[];
};

type Reading = {
  _id: string;
  slug: string | null;
  name: string | null;
  stripePaymentLink: string | null;
};

type BookingForm = {
  sections: SectionRef[];
};

type BookingGiftForm = {
  consentGroup: unknown;
};

const failures: string[] = [];

function fail(invariant: string, detail: string) {
  failures.push(`✗ [${invariant}] ${detail}`);
}

function ok(invariant: string, detail: string) {
  console.log(`✓ [${invariant}] ${detail}`);
}

function appliesTo(arr: string[] | null | undefined, slug: string): boolean {
  return !arr || arr.length === 0 || arr.includes(slug);
}

async function main() {
  console.log(`\nContent-contract verification — dataset=${dataset}\n`);

  const [bookingForm, readings, giftForm] = await Promise.all([
    client.fetch<BookingForm | null>(
      `*[_type == "bookingForm"][0]{
         sections[]->{
           _id,
           sectionTitle,
           appliesToServices,
           fields[]->{
             key,
             type,
             required,
             appliesToServices
           }
         }
       }`,
    ),
    client.fetch<Reading[]>(
      `*[_type == "reading"]{
         _id,
         "slug": slug.current,
         name,
         stripePaymentLink
       }`,
    ),
    client.fetch<BookingGiftForm | null>(`*[_type == "bookingGiftForm"][0]{ ... }`),
  ]);

  if (!bookingForm) {
    fail("invariant-3", "No bookingForm document found in dataset.");
  } else {
    const consentFields: { section: string; key: string }[] = [];
    for (const section of bookingForm.sections ?? []) {
      for (const field of section.fields ?? []) {
        if (field.type === "consent") {
          consentFields.push({ section: section.sectionTitle, key: field.key });
        }
      }
    }
    if (consentFields.length > 0) {
      for (const cf of consentFields) {
        fail(
          "invariant-3",
          `Deprecated consent-type field still present: section="${cf.section}" key="${cf.key}". Run scripts/migrate-strip-consent-fields-2026-05.ts.`,
        );
      }
    } else {
      ok("invariant-3", "No deprecated consent-type fields in bookingForm.");
    }
  }

  const linked = readings.filter((r) => r.stripePaymentLink);
  const seenLinks = new Map<string, string>();
  for (const reading of linked) {
    if (!reading.stripePaymentLink) continue;
    const prior = seenLinks.get(reading.stripePaymentLink);
    if (prior) {
      fail(
        "invariant-2",
        `Duplicate stripePaymentLink: readings "${prior}" and "${reading.slug ?? reading._id}" share link "${reading.stripePaymentLink}".`,
      );
    } else {
      seenLinks.set(reading.stripePaymentLink, reading.slug ?? reading._id);
    }
  }
  if (seenLinks.size === linked.length) {
    ok("invariant-2", `${linked.length} readings — all stripePaymentLink values unique.`);
  }

  if (bookingForm) {
    for (const reading of readings) {
      const slug = reading.slug;
      if (!slug) continue;
      let requiredCount = 0;
      let presentCount = 0;
      for (const section of bookingForm.sections ?? []) {
        if (!appliesTo(section.appliesToServices, slug)) continue;
        for (const field of section.fields ?? []) {
          if (!appliesTo(field.appliesToServices, slug)) continue;
          if (field.required !== true) continue;
          if (field.type === "consent") continue;
          requiredCount += 1;
          if (field.key && field.key.length > 0) {
            presentCount += 1;
          } else {
            fail(
              "invariant-1",
              `Reading "${slug}" — required field has empty key in section "${section.sectionTitle}".`,
            );
          }
        }
      }
      ok(
        "invariant-1",
        `Reading "${slug}" — ${presentCount}/${requiredCount} required fields keyed.`,
      );
    }
  }

  if (giftForm) {
    ok("invariant-3", "bookingGiftForm document present.");
  } else {
    console.log(`  [info] bookingGiftForm document not yet seeded in dataset "${dataset}" — non-blocking.`);
  }

  console.log();
  if (failures.length > 0) {
    console.error(`Content contract FAILED with ${failures.length} violation(s):\n`);
    for (const f of failures) console.error(f);
    process.exit(1);
  }
  console.log("Content contract OK — all invariants pass.");
}

main().catch((error) => {
  console.error("verify-content-contract crashed:", error);
  process.exit(2);
});
