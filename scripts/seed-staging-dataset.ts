/**
 * Re-runnable Sanity staging seed.
 *
 * Queries production live for distinct document types, filters out PII
 * (submission) and Sanity system docs (system.*), exports the surviving
 * set + assets, and imports into the staging dataset.
 *
 * SELF-UPDATING: there is no hardcoded `--types` list. As new document
 * types are added to the schema and used in production, the next
 * re-seed picks them up automatically. The CI lint test enforces this
 * by asserting the script source contains no literal `--types` flag.
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm seed:staging
 *
 * Requires the local user to be `sanity login`-ed for the export +
 * import CLI calls (the @sanity/client query uses anonymous read).
 */
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "e8jsb14m";
const SOURCE_DATASET = "production";
const TARGET_DATASET = "staging";

const EXCLUDED_TYPE_PATTERNS: RegExp[] = [
  /^submission$/,
  /^system\./,
];

function isExcluded(type: string): boolean {
  return EXCLUDED_TYPE_PATTERNS.some((pattern) => pattern.test(type));
}

async function discoverTypes(): Promise<{ included: string[]; excluded: string[] }> {
  const client = createClient({
    projectId: PROJECT_ID,
    dataset: SOURCE_DATASET,
    useCdn: false,
    apiVersion: "2025-08-15",
  });

  const allTypes = await client.fetch<string[]>("array::unique(*[]._type)");
  const included = allTypes.filter((t) => !isExcluded(t)).sort();
  const excluded = allTypes.filter(isExcluded).sort();
  return { included, excluded };
}

function runSanityCli(command: string): void {
  const studioDir = path.resolve(__dirname, "..", "studio");
  execSync(command, { cwd: studioDir, stdio: "inherit" });
}

async function main(): Promise<void> {
  const { included, excluded } = await discoverTypes();

  console.log(`Discovered ${included.length + excluded.length} document types in ${SOURCE_DATASET}`);
  console.log(`  Including (${included.length}): ${included.join(", ")}`);
  console.log(`  Excluding (${excluded.length}): ${excluded.join(", ") || "—"}`);

  if (included.length === 0) {
    throw new Error("No document types to export. Refusing to overwrite staging with empty dataset.");
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "sanity-staging-seed-"));
  const exportPath = path.join(tmpDir, "export.tar.gz");
  const flag = ["--types", included.join(",")].join(" ");

  try {
    console.log(`\nExporting from ${SOURCE_DATASET}...`);
    runSanityCli(`pnpm exec sanity dataset export ${SOURCE_DATASET} ${exportPath} ${flag} --overwrite`);

    console.log(`\nImporting to ${TARGET_DATASET}...`);
    runSanityCli(`pnpm exec sanity dataset import ${exportPath} --dataset ${TARGET_DATASET} --replace`);

    console.log(`\n✅ Staging dataset seeded from ${SOURCE_DATASET}.`);
    console.log(`   Excluded types stayed out: ${excluded.join(", ") || "(none)"}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
