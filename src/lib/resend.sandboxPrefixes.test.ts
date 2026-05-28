import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { isSandboxEmail,SANDBOX_EMAIL_PREFIXES } from "./resend";

const SPECS_DIR = join(process.cwd(), "tests", "e2e", "specs");
const PREFIX_PATTERN = /["`']([a-z][a-z0-9-]*)\+[^@"`']*@withjosephine\.com["`']/g;

function walkSpecs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkSpecs(full));
    } else if (entry.endsWith(".spec.ts") || entry.endsWith(".spec.tsx")) {
      out.push(full);
    }
  }
  return out;
}

function collectPrefixesFromSpecs(): Set<string> {
  const found = new Set<string>();
  for (const path of walkSpecs(SPECS_DIR)) {
    const src = readFileSync(path, "utf8");
    for (const match of src.matchAll(PREFIX_PATTERN)) {
      const prefix = `${match[1]}+`;
      found.add(prefix);
    }
  }
  return found;
}

describe("SANDBOX_EMAIL_PREFIXES vs tests/e2e/specs/", () => {
  it("every email prefix used in e2e specs is registered in SANDBOX_EMAIL_PREFIXES", () => {
    const used = collectPrefixesFromSpecs();
    const registered = new Set<string>(SANDBOX_EMAIL_PREFIXES);
    const missing = [...used].filter((p) => !registered.has(p));
    expect(
      missing,
      `e2e spec(s) use email prefix(es) not registered in SANDBOX_EMAIL_PREFIXES (src/lib/resend.tsx). Add to the list, otherwise Resend will fire real emails on the cron/webhook/DO paths that bypass the request-header guard. Missing: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("isSandboxEmail returns true for each registered prefix on @withjosephine.com", () => {
    for (const prefix of SANDBOX_EMAIL_PREFIXES) {
      expect(isSandboxEmail(`${prefix}probe-12345@withjosephine.com`)).toBe(true);
    }
  });

  it("isSandboxEmail returns false for non-sandbox addresses on @withjosephine.com", () => {
    expect(isSandboxEmail("hello@withjosephine.com")).toBe(false);
    expect(isSandboxEmail("becky@withjosephine.com")).toBe(false);
  });
});
