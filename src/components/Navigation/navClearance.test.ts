import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { NAV_DESKTOP_MEDIA } from "./navClearance";

describe("NAV_DESKTOP_MEDIA", () => {
  it("matches the --breakpoint-nav value in globals.css", () => {
    const css = readFileSync(join(process.cwd(), "src", "styles", "globals.css"), "utf8");
    const breakpoint = css.match(/--breakpoint-nav:\s*([^;]+);/)?.[1].trim();

    expect(NAV_DESKTOP_MEDIA).toBe(`(min-width: ${breakpoint})`);
  });
});
