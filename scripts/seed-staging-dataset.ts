/**
 * Re-runnable Sanity staging seed.
 *
 * Queries production live for distinct document types, filters out PII
 * (submission) and Sanity system docs (system.*), exports the surviving
 * set + assets, and imports into the staging dataset.
 *
 * SELF-UPDATING: there is no hardcoded `--types` list. As new document
 * types are added to the schema and used in production, the next
 * re-seed picks them up automatically. The CI lint test enforces this.
 *
 * Run:
 *   set -a && source .env.local && set +a && pnpm seed:staging
 *
 * Requires the local user to be `sanity login`-ed for the export +
 * import CLI calls (the @sanity/client query uses anonymous read).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@sanity/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_DATASET = "production";
const TARGET_DATASET = "staging";

export function isExcluded(type: string): boolean {
  return type === "submission" || type.startsWith("system.");
}

async function discoverTypes(
  projectId: string,
): Promise<{ included: string[]; excluded: string[] }> {
  const client = createClient({
    projectId,
    dataset: SOURCE_DATASET,
    useCdn: false,
    apiVersion: "2025-08-15",
  });

  const allTypes = await client.fetch<string[]>("array::unique(*[]._type)");
  const included = allTypes.filter((t) => !isExcluded(t)).sort();
  const excluded = allTypes.filter(isExcluded).sort();
  return { included, excluded };
}

function runSanity(args: string[]): void {
  const studioDir = path.resolve(__dirname, "..", "studio");
  execFileSync("pnpm", ["exec", "sanity", ...args], {
    cwd: studioDir,
    stdio: "inherit",
  });
}

async function main(): Promise<void> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_SANITY_PROJECT_ID is required (set in .env.local)",
    );
  }

  const { included, excluded } = await discoverTypes(projectId);

  console.log(
    `Discovered ${included.length + excluded.length} document types in ${SOURCE_DATASET}`,
  );
  console.log(`  Including (${included.length}): ${included.join(", ")}`);
  console.log(`  Excluding (${excluded.length}): ${excluded.join(", ") || "—"}`);

  if (included.length === 0) {
    throw new Error(
      "No document types to export. Refusing to overwrite staging with empty dataset.",
    );
  }

  const tmpDir = mkdtempSync(path.join(tmpdir(), "sanity-staging-seed-"));
  const exportPath = path.join(tmpDir, "export.tar.gz");

  try {
    console.log(`\nExporting from ${SOURCE_DATASET}...`);
    runSanity([
      "dataset",
      "export",
      SOURCE_DATASET,
      exportPath,
      "--types",
      included.join(","),
      "--overwrite",
    ]);

    console.log(`\nImporting to ${TARGET_DATASET}...`);
    runSanity([
      "dataset",
      "import",
      exportPath,
      "--dataset",
      TARGET_DATASET,
      "--replace",
    ]);

    console.log(`\n✅ Staging dataset seeded from ${SOURCE_DATASET}.`);
    console.log(`   Excluded types stayed out: ${excluded.join(", ") || "(none)"}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

const isDirectExecution = process.argv[1] === __filename;
if (isDirectExecution) {
  main().catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
}
