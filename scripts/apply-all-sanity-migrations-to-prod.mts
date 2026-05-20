import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const SELF = "apply-all-sanity-migrations-to-prod.mts";

// Chronological-by-filename order. All migrations are idempotent (setIfMissing,
// drift-detect-then-set, createOrReplace with canonical content, or unset
// no-op-when-absent). Audit performed 2026-05-20 — see CHANGELOG PR #155
// follow-up. Order is preserved here so re-runs are deterministic.
const MIGRATION_ORDER = [
  "migrate-name-fields.mts",
  "migrate-booking-form-v2.ts",
  "migrate-theme-semantic.ts",
  "migrate-anything-copy.mts",
  "migrate-privacy-clarity.ts",
  "migrate-privacy-mixpanel.ts",
  "migrate-privacy-retention.ts",
  "migrate-consent-banner-clarity.ts",
  "migrate-booking-page-copy-2026-05.ts",
  "migrate-gift-copy-2026-05.ts",
  "migrate-gift-pages-2026-05.ts",
  "migrate-gift-form-validation-2026-05.ts",
  "migrate-gift-form-consents-deprecate-required-2026-05.ts",
  "migrate-my-gifts-actions-copy.ts",
  "migrate-privacy-subprocessors-2026-05.ts",
  "migrate-strip-consent-fields-2026-05.ts",
  "migrate-restore-time-unknown-checkbox-2026-05.ts",
  "migrate-thank-you-gift-variant-2026-05.ts",
  "migrate-gift-claim-already-submitted-2026-05-18.ts",
  "migrate-gift-claim-session-expired-2026-05-18.ts",
  "migrate-thank-you-confirmation-body-2026-05-18.ts",
  "migrate-thank-you-gift-aware-bodies-2026-05-18.ts",
  "migrate-thank-you-gift-recipient-name-2026-05-18.ts",
  "migrate-thank-you-gift-self-send-2026-05-18.ts",
  "migrate-refund-line-my-gifts-url-2026-05-18.ts",
  "migrate-my-gifts-cancel-scheduled-copy-2026-05-19.ts",
  "migrate-refund-policy-no-refunds-2026-05-19.ts",
] as const;

interface Result {
  script: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  mutated: boolean;
}

const MUTATION_PATTERNS = [
  /setIfMissing applied/i,
  /Patching\b/i,
  /Patched\b/i,
  /Reset \w/i,
  /Unset \d/i,
  /deleted \d+ field doc/i,
  /Updated \w/i,
  /restored\b/i,
  /Cleared\b/i,
];

function looksLikeMutation(output: string): boolean {
  return MUTATION_PATTERNS.some((re) => re.test(output));
}

function sourceDotenvLocal(): void {
  const envPath = path.resolve(HERE, "..", ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!m) continue;
      const key = m[1]!;
      let value = m[2]!.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    console.warn(
      `[apply-all] could not source ${envPath}: ${(err as Error).message}`,
    );
  }
}

async function main(): Promise<void> {
  sourceDotenvLocal();

  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";

  if (!process.env.SANITY_WRITE_TOKEN) {
    throw new Error(
      "SANITY_WRITE_TOKEN is required. Source .env.local with a prod-write token first.",
    );
  }
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is required.");
  }

  const onDisk = new Set(
    (await readdir(HERE)).filter(
      (f) =>
        f.startsWith("migrate-") &&
        (f.endsWith(".ts") || f.endsWith(".mts")) &&
        f !== SELF,
    ),
  );
  const missingFromOrder = [...onDisk].filter(
    (f) => !MIGRATION_ORDER.includes(f as (typeof MIGRATION_ORDER)[number]),
  );
  const missingFromDisk = MIGRATION_ORDER.filter((f) => !onDisk.has(f));
  if (missingFromOrder.length > 0 || missingFromDisk.length > 0) {
    throw new Error(
      `Order drift detected.\n` +
        `On disk but not in MIGRATION_ORDER: ${missingFromOrder.join(", ") || "(none)"}\n` +
        `In MIGRATION_ORDER but not on disk: ${missingFromDisk.join(", ") || "(none)"}\n` +
        `Update MIGRATION_ORDER in ${SELF} to match.`,
    );
  }

  console.log(
    `[apply-all] dataset=production, project=${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}, ${MIGRATION_ORDER.length} migrations queued.`,
  );

  const results: Result[] = [];
  for (const script of MIGRATION_ORDER) {
    console.log(`\n========== ${script} ==========`);
    const child = spawnSync("pnpm", ["exec", "tsx", path.join(HERE, script)], {
      encoding: "utf8",
      env: { ...process.env },
    });
    const stdout = child.stdout ?? "";
    const stderr = child.stderr ?? "";
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
    results.push({
      script,
      exitCode: child.status,
      stdout,
      stderr,
      mutated: looksLikeMutation(stdout + stderr),
    });
  }

  console.log("\n\n========== SUMMARY ==========");
  let mutated = 0;
  let noop = 0;
  let failed = 0;
  for (const r of results) {
    const tag =
      r.exitCode !== 0 ? "✗ FAIL" : r.mutated ? "✎ MUTATED" : "○ noop";
    console.log(`${tag}  ${r.script}`);
    if (r.exitCode !== 0) failed++;
    else if (r.mutated) mutated++;
    else noop++;
  }
  console.log(
    `\nTotals: ${mutated} mutated · ${noop} no-op · ${failed} failed (of ${results.length})`,
  );

  const logPath = path.resolve(
    HERE,
    "..",
    "docs",
    `prod-migration-run-${new Date().toISOString().slice(0, 10)}.log`,
  );
  await writeFile(
    logPath,
    results
      .map(
        (r) =>
          `===== ${r.script} (exit ${r.exitCode}, ${r.mutated ? "MUTATED" : "noop"}) =====\n` +
          (r.stdout || "") +
          (r.stderr ? `\n--- stderr ---\n${r.stderr}` : ""),
      )
      .join("\n\n"),
    "utf8",
  );
  console.log(`\nFull log → ${logPath}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
