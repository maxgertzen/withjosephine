import { describe, expect, it } from "vitest";

import robots from "./robots";

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

  it("disallows /gift/ for OAI-SearchBot", () => {
    expect(disallowFor("OAI-SearchBot")).toContain("/gift/");
  });
});
