import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { STUDIO_SRC_ALIASES } from "../studio/srcAliases";
import { checkStory, FORBIDDEN_SPECIFIERS } from "./check-stories-import-graph.mts";

const STUDIO = path.resolve(__dirname, "../studio");
const SKIPPED_FOLDERS = new Set(["node_modules", "dist", "www", "preview-stubs"]);
const STUDIO_FILE = /\.(ts|tsx)$/;
const TEST_FILE = /\.test\.(ts|tsx)$/;

function studioFiles(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) return SKIPPED_FOLDERS.has(entry.name) ? [] : studioFiles(full);
    return STUDIO_FILE.test(entry.name) && !TEST_FILE.test(entry.name) ? [full] : [];
  });
}

const CODE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
const EXTENSIONS = ["", ...CODE_EXTENSIONS, ...CODE_EXTENSIONS.map((ext) => `/index${ext}`)];
const NOT_CODE = /\.(css|svg|png|jpe?g|webp|json)$/;
const STUDIO_FORBIDDEN = new Set([...FORBIDDEN_SPECIFIERS, "resend", "stripe"]);

function existingFile(base: string): string | null {
  return EXTENSIONS.map((ext) => base + ext).find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function aliasTarget(specifier: string): string | null {
  const alias = STUDIO_SRC_ALIASES.find(({ find }) => find.test(specifier));
  return alias ? specifier.replace(alias.find, alias.replacement) : null;
}

describe("Studio imports from src", () => {
  const files = studioFiles(STUDIO);

  it("finds the Studio files", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("reaches only allowlisted src files that exist, and never server-only, Next server, Resend or Stripe imports", () => {
    const notAllowlisted = new Set<string>();
    const missing = new Set<string>();
    const resolveOrRecord = (base: string, specifier: string, fromFile: string) => {
      const file = existingFile(base);
      if (!file && !NOT_CODE.test(specifier)) missing.add(`${specifier} (from ${path.relative(STUDIO, fromFile)})`);
      return file;
    };
    const serverOnly = files.flatMap((file) =>
      checkStory(file, {
        forbidden: STUDIO_FORBIDDEN,
        resolve: (specifier, fromFile) => {
          if (specifier.startsWith(".")) return resolveOrRecord(path.resolve(path.dirname(fromFile), specifier), specifier, fromFile);
          if (!specifier.startsWith("@/")) return null;
          const target = aliasTarget(specifier);
          if (!target) notAllowlisted.add(`${specifier} (from ${path.relative(STUDIO, fromFile)})`);
          return target ? resolveOrRecord(target, specifier, fromFile) : null;
        },
      }).map((violation) => `${violation.forbiddenSpecifier} via ${violation.chain.map((link) => path.relative(STUDIO, link)).join(" > ")}`),
    );

    expect([...notAllowlisted]).toEqual([]);
    expect([...missing]).toEqual([]);
    expect(serverOnly).toEqual([]);
  });
});
