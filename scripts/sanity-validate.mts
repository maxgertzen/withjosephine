// PR-template guidance (surfaced here until a real .github/pull_request_template.md exists):
//   If this PR touches `studio/schemas/`: confirm any associated migration
//   script in `scripts/migrate-*.ts` was run on the staging dataset, OR
//   explicitly note "no migration needed" in the PR description.
//
// Why this script exists:
//   Production Studio surfaced schema-vs-data drift twice in 36 hours
//   (2026-05-25): an Array-vs-String mismatch on the Day-7 email body, then
//   a Sanity-mirror dataset misrouting (production env writing to the wrong
//   dataset). Migration scripts exist but aren't required pre-deploy, so
//   production data drifts from schema silently and Becky sees Studio
//   validation banners.
//
//   This harness fetches each known singleton from the target dataset and
//   asserts every field's runtime value type matches its schema contract.
//   Hooked into CI after `deploy-staging` so any drift is caught before it
//   reaches Becky's eyes.
//
// Run locally:
//   pnpm sanity:validate staging
//   pnpm sanity:validate production   # Max-action only
//   pnpm sanity:validate staging --strict   # promote SCHEMA-DRIFT to a hard fail
//
// Result categories:
//   DRIFT         doc exists but a field's value type does not match the
//                 schema's expected type. Exit code 1 (fails CI).
//   MISSING       singleton doc absent from dataset (no published, no
//                 draft). Initialization gap. Warning only.
//   SCHEMA-DRIFT  doc carries a field not declared in this script's
//                 contract. Warning only by default; --strict promotes to
//                 hard fail.
//   WARNING       soft issues (e.g. legacy formField consent type). Warning
//                 only.
//
// Exit code is non-zero on DRIFT, or on SCHEMA-DRIFT when --strict is set.

import fs from "node:fs";
import { createClient, type SanityClient } from "@sanity/client";

import { describeValueShape } from "./_lib/sanityValueShape.mts";
import { SINGLETONS, type FieldContract, type ExpectedType } from "./sanity-validate-contract.mts";
import { findSchemaDrift, type SchemaDrift } from "./sanity-validate-drift.mts";

// ---------- env loading ----------
//
// Mirrors `scripts/seed-customer-emails-and-pages.mts`. Reads `.env.local`
// from the current working directory (`www/`). On CI the runner does not
// have a `.env.local`, so we fall through to `process.env` populated by the
// workflow `env:` block.
function loadDotEnv(): void {
  try {
    const env = fs.readFileSync(".env.local", "utf-8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.+)$/);
      if (m) {
        // Don't overwrite values already set by the runner / shell.
        if (process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^"|"$/g, "");
        }
      }
    }
  } catch {
    // No .env.local — fine on CI.
  }
}

loadDotEnv();

const dataset = process.argv[2];
if (dataset !== "staging" && dataset !== "production") {
  console.error("Usage: pnpm sanity:validate <staging|production>");
  process.exit(2);
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
if (!projectId) {
  console.error("NEXT_PUBLIC_SANITY_PROJECT_ID missing in env.");
  process.exit(2);
}

// Prefer the read-only token. Fall back to write token if read token is not
// configured — read-only is strongly preferred for a validation harness so we
// can't accidentally mutate, but write works as a fallback since reads are a
// subset of write permissions.
const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error("SANITY_READ_TOKEN (or SANITY_WRITE_TOKEN fallback) missing in env.");
  process.exit(2);
}

const client: SanityClient = createClient({
  projectId,
  dataset,
  apiVersion: "2024-01-01",
  useCdn: false,
  token,
});

// ---------- type assertions ----------

interface Drift {
  singleton: string;
  field: string;
  expected: ExpectedType;
  actual: string;
  detail?: string;
}

type SanityValue = unknown;

function isPortableTextBlockArray(value: SanityValue): boolean {
  if (!Array.isArray(value)) return false;
  // PortableText blocks have shape `{ _type: "block", children: [...], ... }`.
  // Editor may also include custom block types — we accept any object with a
  // `_type` field.
  return value.every((item) => {
    if (item === null || typeof item !== "object") return false;
    return "_type" in (item as Record<string, unknown>);
  });
}

function isReferenceShape(value: SanityValue): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return typeof v._ref === "string" && v._type === "reference";
}

function checkField(value: SanityValue, expected: ExpectedType): { ok: boolean; detail?: string } {
  switch (expected) {
    case "string":
    case "text":
    case "url":
      return { ok: typeof value === "string" };
    case "boolean":
      return { ok: typeof value === "boolean" };
    case "number":
      return { ok: typeof value === "number" };
    case "image":
    case "object":
      return {
        ok: value !== null && typeof value === "object" && !Array.isArray(value),
      };
    case "reference":
      return {
        ok: isReferenceShape(value),
        detail: isReferenceShape(value) ? undefined : "expected { _ref, _type: 'reference' }",
      };
    case "array":
      return { ok: Array.isArray(value) };
    case "array<block>":
      return {
        ok: isPortableTextBlockArray(value),
        detail: Array.isArray(value)
          ? "array items missing _type — not Portable Text blocks"
          : undefined,
      };
    case "array<text>":
      return {
        ok: Array.isArray(value) && value.every((v) => typeof v === "string"),
      };
  }
}

function validateField(
  singletonId: string,
  doc: Record<string, unknown>,
  field: FieldContract,
): Drift[] {
  const value = doc[field.name];
  // Missing/null: only a hard fail if required. Otherwise skip (Sanity allows
  // optional fields to be absent — the schema's `initialValue` populates on
  // first edit).
  if (value === null || value === undefined) {
    if (field.required) {
      return [
        {
          singleton: singletonId,
          field: field.name,
          expected: field.type,
          actual: describeValueShape(value),
          detail: "required field missing",
        },
      ];
    }
    return [];
  }
  const result = checkField(value, field.type);
  if (result.ok) return [];
  return [
    {
      singleton: singletonId,
      field: field.name,
      expected: field.type,
      actual: describeValueShape(value),
      detail: result.detail,
    },
  ];
}

// ---------- main ----------

interface Missing {
  singleton: string;
  type: string;
}

async function fetchSingleton(id: string): Promise<Record<string, unknown> | null> {
  // Validate what customers see: the published document. Drafts are checked
  // separately below as part of the MISSING probe (a doc with only a draft is
  // still effectively missing from the customer-facing dataset, but we want
  // to surface that distinct shape clearly).
  const doc = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $id][0]`,
    { id },
  );
  return doc;
}

async function existsAnywhere(id: string): Promise<boolean> {
  // Probe both the published doc and the corresponding draft. Returning true
  // here means the singleton has been initialized at least once; false means
  // it's truly absent (MISSING).
  const result = await client.fetch<number>(
    `count(*[_id == $id || _id == $draftId])`,
    { id, draftId: `drafts.${id}` },
  );
  return result > 0;
}

async function runSingletonChecks(): Promise<{
  drifts: Drift[];
  missing: Missing[];
  schemaDrifts: SchemaDrift[];
}> {
  const drifts: Drift[] = [];
  const missing: Missing[] = [];
  const schemaDrifts: SchemaDrift[] = [];
  for (const singleton of SINGLETONS) {
    const doc = await fetchSingleton(singleton.id);
    if (!doc) {
      const draftExists = await existsAnywhere(singleton.id);
      missing.push({
        singleton: singleton.id,
        type: draftExists ? `${singleton.type} (draft only, never published)` : singleton.type,
      });
      continue;
    }
    if (doc._type !== singleton.type) {
      drifts.push({
        singleton: singleton.id,
        field: "_type",
        expected: "string",
        actual: String(doc._type),
        detail: `expected _type "${singleton.type}"`,
      });
    }
    for (const field of singleton.fields) {
      drifts.push(...validateField(singleton.id, doc, field));
    }
    schemaDrifts.push(...findSchemaDrift(singleton, doc));
  }
  return { drifts, missing, schemaDrifts };
}

interface ConsentWarning {
  docId: string;
  name?: string;
}

async function runZombieConsentCheck(): Promise<ConsentWarning[]> {
  // Inverse check: any `formField` document still holding the legacy
  // `type == "consent"` value. The schema option was removed from
  // `studio/schemas/formField.ts`, but legacy documents in the dataset may
  // still carry the raw enum value — they render nothing but can lock submit
  // on existing forms with `currentPageValid` returning false silently.
  //
  // Warning, not error: harmless until rendered. Surfacing here gives Becky /
  // Max a heads-up to clean up via a one-shot migration if any survived the
  // 2026-05 strip pass.
  const docs = await client.fetch<Array<{ _id: string; name?: string; type?: string }>>(
    `*[_type == "formField" && type == "consent"]{ _id, name, type }`,
  );
  return docs.map((d) => ({ docId: d._id, name: d.name }));
}

// ---------- output ----------

function formatDrift(d: Drift): string {
  const detail = d.detail ? ` — ${d.detail}` : "";
  return `  [DRIFT]   ${d.singleton}.${d.field}: expected=${d.expected} actual=${d.actual}${detail}`;
}

function formatMissing(m: Missing): string {
  return `  [MISSING] ${m.singleton} (type=${m.type}) — singleton document not found in dataset; initialize via Studio or seed script.`;
}

function formatWarning(w: ConsentWarning): string {
  return `  [WARNING] formField(${w.docId})${w.name ? ` name="${w.name}"` : ""}: legacy type="consent" — schema no longer renders this; consider migrating or deleting.`;
}

function formatSchemaDrift(d: SchemaDrift): string {
  return `  [SCHEMA-DRIFT] ${d.singleton}.${d.unknownField}: not declared in contract (value type=${d.valueType}). Add to scripts/sanity-validate-contract.mts or remove from the schema.`;
}

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  console.log(`[sanity-validate] dataset=${dataset} projectId=${projectId} strict=${strict}`);
  console.log(`[sanity-validate] checking ${SINGLETONS.length} singletons…`);

  const { drifts, missing, schemaDrifts } = await runSingletonChecks();
  const warnings = await runZombieConsentCheck();

  if (drifts.length === 0) {
    console.log(`[sanity-validate] ✓ no drift detected across ${SINGLETONS.length} singletons.`);
  } else {
    console.log(`[sanity-validate] ✗ ${drifts.length} drift(s) detected:`);
    for (const d of drifts) console.log(formatDrift(d));
  }

  if (missing.length > 0) {
    console.log(`[sanity-validate] ${missing.length} missing singleton(s):`);
    for (const m of missing) console.log(formatMissing(m));
  }

  if (schemaDrifts.length > 0) {
    console.log(`[sanity-validate] ${schemaDrifts.length} schema-additive drift(s) detected:`);
    for (const d of schemaDrifts) console.log(formatSchemaDrift(d));
  }

  if (warnings.length > 0) {
    console.log(`[sanity-validate] ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(formatWarning(w));
  }

  console.log(
    `[sanity-validate] summary: drift=${drifts.length} missing=${missing.length} schema-drift=${schemaDrifts.length} warnings=${warnings.length} singletons_checked=${SINGLETONS.length}`,
  );

  const hardFailures = drifts.length + (strict ? schemaDrifts.length : 0);
  process.exit(hardFailures === 0 ? 0 : 1);
}

await main();
