import { createClient } from "@sanity/client";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  bookingFormQuery,
  bookingGiftFormQuery,
  bookingPageQuery,
  giftClaimPageQuery,
  giftIntakePageQuery,
  myGiftsPageQuery,
  readingBySlugQuery,
  readingsQuery,
  siteSettingsQuery,
  themeQuery,
  thankYouPageQuery,
} from "../src/lib/sanity/queries";
import { READING_SLUGS } from "../tests/e2e/fixtures/readings";

const EMAIL_REPLACE = "e2e-test@withjosephine.com";
const REAL_NAMES = ["Josephine", "Becky", "Natali", "Likush", "Alma", "Max", "Maxim"];
const NAME_REGEX = new RegExp(`\\b(?:${REAL_NAMES.join("|")})\\b`, "g");
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const HELLO_AT_REGEX = /hello@[^\s,;)]+/gi;
const PII_KEYS = new Set([
  "contactEmail",
  "fromAddress",
  "toAddress",
  "phone",
  "tel",
  "phoneNumber",
  "purchaserEmail",
  "recipientEmail",
]);

function anonymizeValue(value: unknown, currentKey: string | null): unknown {
  if (typeof value === "string") {
    if (currentKey === "_id" || currentKey === "_ref") return value;
    if (currentKey && PII_KEYS.has(currentKey)) return EMAIL_REPLACE;
    return value
      .replace(HELLO_AT_REGEX, EMAIL_REPLACE)
      .replace(EMAIL_REGEX, EMAIL_REPLACE)
      .replace(NAME_REGEX, "[E2E-Author]");
  }
  if (Array.isArray(value)) return value.map((item) => anonymizeValue(item, currentKey));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = anonymizeValue(v, k);
    }
    return out;
  }
  return value;
}

type FixtureSpec = {
  filename: string;
  query: string;
  params?: Record<string, unknown>;
};

function buildSpecs(): FixtureSpec[] {
  return [
    { filename: "bookingForm.json", query: bookingFormQuery },
    { filename: "bookingGiftForm.json", query: bookingGiftFormQuery },
    { filename: "bookingPage.json", query: bookingPageQuery },
    { filename: "giftClaimPage.json", query: giftClaimPageQuery },
    { filename: "giftIntakePage.json", query: giftIntakePageQuery },
    { filename: "myGiftsPage.json", query: myGiftsPageQuery },
    { filename: "readings.json", query: readingsQuery },
    { filename: "siteSettings.json", query: siteSettingsQuery },
    { filename: "thankYouPage.json", query: thankYouPageQuery },
    { filename: "theme.json", query: themeQuery },
    ...READING_SLUGS.map<FixtureSpec>((slug) => ({
      filename: `reading-${slug}.json`,
      query: readingBySlugQuery,
      params: { slug },
    })),
  ];
}

async function main() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.FIXTURE_SOURCE_DATASET ?? "staging";
  const token = process.env.SANITY_READ_TOKEN;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing. Set in .env.local before running.");
  }
  if (!token) {
    throw new Error("SANITY_READ_TOKEN missing. Set in .env.local before running.");
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const outDir = path.resolve(here, "../src/__fixtures__/sanity/e2e");
  await mkdir(outDir, { recursive: true });

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2025-01-01",
    token,
    useCdn: false,
  });

  const specs = buildSpecs();

  // eslint-disable-next-line no-console
  console.log(`[fixture-gen] dataset=${dataset} project=${projectId} → ${outDir}`);

  await Promise.all(
    specs.map(async (spec) => {
      const result = await client.fetch(spec.query, spec.params ?? {});
      const anonymized = anonymizeValue(result, null);
      const file = path.join(outDir, spec.filename);
      await writeFile(file, JSON.stringify(anonymized, null, 2) + "\n", "utf8");
      // eslint-disable-next-line no-console
      console.log(`  ✓ ${spec.filename} ${result == null ? "(null)" : `(${typeof result})`}`);
    }),
  );

  // eslint-disable-next-line no-console
  console.log("[fixture-gen] done. Commit the JSON files in src/__fixtures__/sanity/e2e/.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[fixture-gen] failed:", err);
  process.exit(1);
});
