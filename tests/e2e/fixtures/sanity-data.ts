import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(here, "../../../src/__fixtures__/sanity/e2e");

export type FixtureReading = {
  _id: string;
  name: string;
  slug: string;
  tag?: string;
  subtitle?: string;
  price: number;
  priceDisplay: string;
  valueProposition?: string;
  briefDescription?: string;
  expandedDetails?: unknown;
  includes?: unknown;
  bookingSummary?: string;
  requiresBirthChart?: boolean;
  requiresAkashic?: boolean;
  requiresQuestions?: boolean;
  stripePaymentLink?: string;
  seo?: unknown;
};

export async function loadFixtureReadings(): Promise<FixtureReading[]> {
  const file = path.join(fixtureDir, "readings.json");
  const raw = await readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected fixture readings.json to contain an array, got ${typeof parsed}`);
  }
  return parsed as FixtureReading[];
}
