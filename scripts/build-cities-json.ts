/* eslint-disable no-console */
import { spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const GEONAMES_URL = "https://download.geonames.org/export/dump/cities15000.zip";
const TARGET_PATH = resolve(process.cwd(), "public/data/cities.json");
const STAGING_DIR = resolve(process.cwd(), ".cache/geonames");
const POPULATION_FLOOR = 50_000;

type CityRecord = {
  name: string;
  country: string;
  geonameid: number;
  population: number;
};

const COUNTRY_CODES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", AU: "Australia", CA: "Canada",
  NZ: "New Zealand", IE: "Ireland", ZA: "South Africa", DE: "Germany",
  FR: "France", IT: "Italy", ES: "Spain", PT: "Portugal", NL: "Netherlands",
  BE: "Belgium", CH: "Switzerland", AT: "Austria", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", IS: "Iceland", PL: "Poland", CZ: "Czechia",
  GR: "Greece", TR: "Turkey", IL: "Israel", AE: "United Arab Emirates",
  SA: "Saudi Arabia", IN: "India", PK: "Pakistan", BD: "Bangladesh",
  LK: "Sri Lanka", NP: "Nepal", CN: "China", HK: "Hong Kong", TW: "Taiwan",
  JP: "Japan", KR: "South Korea", TH: "Thailand", VN: "Vietnam",
  MY: "Malaysia", SG: "Singapore", ID: "Indonesia", PH: "Philippines",
  MX: "Mexico", BR: "Brazil", AR: "Argentina", CL: "Chile", CO: "Colombia",
  PE: "Peru", EC: "Ecuador", UY: "Uruguay", VE: "Venezuela", EG: "Egypt",
  MA: "Morocco", KE: "Kenya", NG: "Nigeria", GH: "Ghana", ET: "Ethiopia",
  RU: "Russia", UA: "Ukraine", BY: "Belarus", RO: "Romania", HU: "Hungary",
};

async function ensureZip(zipPath: string) {
  try {
    await access(zipPath);
    console.log(`Zip already cached at ${zipPath}`);
  } catch {
    console.log(`Fetching ${GEONAMES_URL} …`);
    const response = await fetch(GEONAMES_URL);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    if (!response.body) throw new Error("Response body is empty");
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(zipPath));
    console.log(`Saved zip to ${zipPath}`);
  }
}

function unzipTo(zipPath: string, dir: string) {
  console.log(`Unzipping ${zipPath} → ${dir}`);
  const result = spawnSync("unzip", ["-o", zipPath, "-d", dir], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("unzip failed — install the `unzip` CLI or unpack manually.");
  }
}

async function main() {
  await mkdir(STAGING_DIR, { recursive: true });
  const zipPath = resolve(STAGING_DIR, "cities15000.zip");
  const txtPath = resolve(STAGING_DIR, "cities15000.txt");

  await ensureZip(zipPath);
  try {
    await access(txtPath);
  } catch {
    unzipTo(zipPath, STAGING_DIR);
  }

  const raw = await readFile(txtPath, "utf-8");
  const lines = raw.split("\n");
  const records: CityRecord[] = [];

  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    const geonameid = Number(cols[0]);
    const asciiname = cols[2];
    const countryCode = cols[8];
    const population = Number(cols[14]);

    if (!Number.isFinite(geonameid) || !asciiname || !countryCode) continue;
    if (!Number.isFinite(population) || population < POPULATION_FLOOR) continue;

    const country = COUNTRY_CODES[countryCode] ?? countryCode;
    records.push({ name: asciiname, country, geonameid, population });
  }

  records.sort((a, b) => b.population - a.population);
  console.log(`Kept ${records.length} cities with population ≥ ${POPULATION_FLOOR}`);

  await mkdir(dirname(TARGET_PATH), { recursive: true });
  const json = JSON.stringify(records);
  await writeFile(TARGET_PATH, json);
  const sizeKb = Buffer.byteLength(json) / 1024;
  console.log(`Wrote ${TARGET_PATH} (${sizeKb.toFixed(1)} KB)`);
  if (sizeKb > 1024) {
    console.warn(
      `cities.json exceeds 1 MB; raise POPULATION_FLOOR in scripts/build-cities-json.ts.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
