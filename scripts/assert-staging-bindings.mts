/**
 * CI guard: parses wrangler.jsonc and asserts the [env.staging] block has the
 * expected bindings (D1 + R2 + vars), correctly named with `-staging` suffix.
 *
 * Catches the misconfig class where staging deploys would silently inherit
 * production binding names, sending customer photos to the prod bucket or
 * writing rows to the prod database.
 *
 * Wrangler's `--dry-run` already validates the schema; this script adds the
 * naming/shape assertion on top.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type WranglerD1Binding = {
  binding: string;
  database_name: string;
  database_id: string;
};

type WranglerR2Binding = {
  binding: string;
  bucket_name: string;
};

type WranglerEnv = {
  name?: string;
  d1_databases?: WranglerD1Binding[];
  r2_buckets?: WranglerR2Binding[];
  vars?: Record<string, string>;
};

type WranglerConfig = {
  env?: Record<string, WranglerEnv>;
};

const STAGING_SUFFIX = "-staging";

function stripJsonc(source: string): string {
  return source
    .replace(/(^|[^:"'])\/\/.*$/gm, "$1")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,(\s*[}\]])/g, "$1");
}

function fail(message: string): never {
  console.error(`assert-staging-bindings: ${message}`);
  process.exit(1);
}

const configPath = resolve(process.cwd(), "wrangler.jsonc");
const raw = readFileSync(configPath, "utf8");
let config: WranglerConfig;

try {
  config = JSON.parse(stripJsonc(raw));
} catch (error) {
  fail(`failed to parse wrangler.jsonc: ${(error as Error).message}`);
}

const staging = config.env?.staging;
if (!staging) {
  fail("wrangler.jsonc has no [env.staging] block");
}

if (staging.name !== "withjosephine-staging") {
  fail(`env.staging.name expected "withjosephine-staging", got "${staging.name ?? "(missing)"}"`);
}

const d1 = staging.d1_databases?.[0];
if (!d1) {
  fail("env.staging.d1_databases is empty");
}
if (!d1.database_name?.endsWith(STAGING_SUFFIX)) {
  fail(`env.staging d1 database_name must end with ${STAGING_SUFFIX}, got "${d1.database_name}"`);
}
if (!d1.database_id) {
  fail("env.staging d1 database_id is missing");
}

const r2 = staging.r2_buckets?.[0];
if (!r2) {
  fail("env.staging.r2_buckets is empty");
}
if (!r2.bucket_name?.endsWith(STAGING_SUFFIX)) {
  fail(`env.staging r2 bucket_name must end with ${STAGING_SUFFIX}, got "${r2.bucket_name}"`);
}

const vars = staging.vars ?? {};
if (vars.ENVIRONMENT !== "staging") {
  fail(`env.staging vars.ENVIRONMENT expected "staging", got "${vars.ENVIRONMENT ?? "(missing)"}"`);
}
if (vars.BOOKING_DB_DRIVER !== "d1") {
  fail(`env.staging vars.BOOKING_DB_DRIVER expected "d1", got "${vars.BOOKING_DB_DRIVER ?? "(missing)"}"`);
}
if (vars.RESEND_DRY_RUN !== "1") {
  fail(`env.staging vars.RESEND_DRY_RUN expected "1", got "${vars.RESEND_DRY_RUN ?? "(missing)"}"`);
}

console.log("assert-staging-bindings: OK");
console.log(`  worker name: ${staging.name}`);
console.log(`  d1 database: ${d1.database_name} (${d1.database_id})`);
console.log(`  r2 bucket:   ${r2.bucket_name}`);
console.log(`  vars:        ENVIRONMENT=${vars.ENVIRONMENT}, BOOKING_DB_DRIVER=${vars.BOOKING_DB_DRIVER}, RESEND_DRY_RUN=${vars.RESEND_DRY_RUN}`);
