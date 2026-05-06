/**
 * Lock-in test for the dynamic-discovery contract of the staging seed
 * script. We do NOT actually run the seed in CI (that would mutate the
 * staging dataset). Instead, we assert structural properties of the
 * source that protect against the regression we're trying to prevent:
 * someone reverting to a hardcoded `--types reading,siteSettings,...`
 * literal that silently misses any future doc type.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCRIPT_PATH = path.resolve(__dirname, "seed-staging-dataset.ts");

const SOURCE = readFileSync(SCRIPT_PATH, "utf8");

describe("seed-staging-dataset script — dynamic-discovery contract", () => {
  it("queries production for live distinct types via array::unique(*[]._type)", () => {
    expect(SOURCE).toMatch(/array::unique\(\*\[\]\._type\)/);
  });

  it("does NOT pass a hardcoded comma-separated --types literal", () => {
    // Match `--types <lowercase-list-of-types>` literals like:
    //   --types reading,siteSettings,landingPage
    //   --types reading
    // Allow runtime-built strings (--types ${...}, ["--types", x.join(",")]).
    const HARDCODED_TYPES_PATTERN = /--types\s+[a-z][a-zA-Z.,]*[a-z](?:\s|$|"|')/;
    expect(SOURCE).not.toMatch(HARDCODED_TYPES_PATTERN);
  });

  it("excludes the submission type (PII protection)", () => {
    expect(SOURCE).toMatch(/\^submission\$/);
  });

  it("excludes Sanity system.* docs", () => {
    expect(SOURCE).toMatch(/\^system\\\./);
  });

  it("targets the staging dataset, not production", () => {
    expect(SOURCE).toMatch(/TARGET_DATASET\s*=\s*["']staging["']/);
    expect(SOURCE).toMatch(/SOURCE_DATASET\s*=\s*["']production["']/);
  });
});
