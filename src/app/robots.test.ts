import { describe, expect, it } from "vitest";

import robots from "./robots";

const CITATION_BOTS = [
  "OAI-SearchBot",
  "PerplexityBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
];

function disallowFor(userAgent: string): string[] {
  const rule = [robots().rules].flat().find((candidate) =>
    [candidate.userAgent].flat().includes(userAgent),
  );
  return [rule?.disallow ?? []].flat();
}

describe("robots", () => {
  it("disallows /gift/ for every crawler", () => {
    expect(disallowFor("*")).toContain("/gift/");
  });

  it.each(CITATION_BOTS)("disallows /gift/ for %s", (bot) => {
    expect(disallowFor(bot)).toContain("/gift/");
  });
});
