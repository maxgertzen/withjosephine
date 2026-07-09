import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { STATIC_CSP_PATHS } from "@/lib/constants";

// Guards the STATIC_CSP_PATHS set (middleware CSP) against drift. A route in
// this set serves `script-src 'unsafe-inline'` (no per-request nonce); a route
// absent from it gets the strict nonce CSP. The regression this prevents:
// #326 flipped the legal pages to `force-dynamic` but left them in the set, so
// they silently ran on the weaker unsafe-inline policy. These checks derive
// truth from the page files themselves, so there is no second list to maintain.

const APP_DIR = join(process.cwd(), "src/app");

const pageFiles = readdirSync(APP_DIR, { recursive: true, encoding: "utf8" }).filter((p) =>
  /(?:^|\/)page\.tsx$/.test(p.replace(/\\/g, "/")),
);

function toRoute(relPath: string): string {
  const segments = relPath
    .replace(/\\/g, "/")
    .replace(/\/?page\.tsx$/, "")
    .split("/")
    // Route groups like (authed) are not part of the URL path.
    .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
  return `/${segments.join("/")}`;
}

function isForceDynamic(relPath: string): boolean {
  const src = readFileSync(join(APP_DIR, relPath), "utf8");
  return /export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/.test(src);
}

describe("STATIC_CSP_PATHS integrity", () => {
  it("lists no force-dynamic route (those carry the strict nonce CSP)", () => {
    const offenders = pageFiles
      .filter(isForceDynamic)
      .map(toRoute)
      .filter((route) => STATIC_CSP_PATHS.has(route));
    expect(offenders).toEqual([]);
  });

  it("every entry maps to an existing, non-force-dynamic page route", () => {
    const staticRoutes = new Set(pageFiles.filter((p) => !isForceDynamic(p)).map(toRoute));
    const stale = [...STATIC_CSP_PATHS].filter((route) => !staticRoutes.has(route));
    expect(stale).toEqual([]);
  });
});
