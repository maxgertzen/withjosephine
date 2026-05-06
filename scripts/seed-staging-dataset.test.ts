/**
 * Tests for the staging seed script.
 *
 * The seed itself is NOT executed (that would mutate the staging
 * dataset). Two layers verified instead:
 *   - Behavioral: the exclusion predicate keeps PII + system docs out.
 *   - Source contract: no hardcoded `--types` literal can sneak back in.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { isExcluded } from "./seed-staging-dataset";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, "seed-staging-dataset.ts");
const SOURCE = readFileSync(SCRIPT_PATH, "utf8");

describe("isExcluded predicate", () => {
  it("excludes the submission type (PII protection)", () => {
    expect(isExcluded("submission")).toBe(true);
  });

  it("excludes Sanity system docs by prefix", () => {
    expect(isExcluded("system.group")).toBe(true);
    expect(isExcluded("system.retention")).toBe(true);
    expect(isExcluded("system.schema")).toBe(true);
  });

  it("does not exclude regular content types", () => {
    expect(isExcluded("reading")).toBe(false);
    expect(isExcluded("siteSettings")).toBe(false);
    expect(isExcluded("sanity.imageAsset")).toBe(false);
  });
});

describe("seed source contract", () => {
  it("queries production live via array::unique(*[]._type)", () => {
    expect(SOURCE).toMatch(/array::unique\(\*\[\]\._type\)/);
  });

  it("does NOT pass a hardcoded comma-separated --types literal", () => {
    expect(SOURCE).not.toMatch(/--types\s+[a-z][a-zA-Z.,]*[a-z](?:\s|$|"|')/);
  });

  it("targets staging, not production", () => {
    expect(SOURCE).toMatch(/TARGET_DATASET\s*=\s*["']staging["']/);
    expect(SOURCE).toMatch(/SOURCE_DATASET\s*=\s*["']production["']/);
  });
});
