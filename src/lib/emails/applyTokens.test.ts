import { describe, expect, it } from "vitest";

import { applyTokens } from "./applyTokens";

describe("applyTokens", () => {
  it("substitutes a token in a single string", () => {
    expect(applyTokens("Hi {firstName},", { firstName: "Ada" })).toBe("Hi Ada,");
  });

  it("substitutes multiple tokens in the same string", () => {
    expect(
      applyTokens("Hi {firstName}, your {readingName} is ready.", {
        firstName: "Ada",
        readingName: "Soul Blueprint",
      }),
    ).toBe("Hi Ada, your Soul Blueprint is ready.");
  });

  it("leaves unknown tokens untouched", () => {
    expect(applyTokens("Hi {bogus},", { firstName: "Ada" })).toBe("Hi {bogus},");
  });

  it("walks arrays recursively", () => {
    expect(applyTokens(["Hi {firstName}.", "Bye {firstName}."], { firstName: "Ada" })).toEqual([
      "Hi Ada.",
      "Bye Ada.",
    ]);
  });

  it("walks objects recursively", () => {
    expect(
      applyTokens({ subject: "{firstName}!", body: ["Hi {firstName}."] }, { firstName: "Ada" }),
    ).toEqual({ subject: "Ada!", body: ["Hi Ada."] });
  });

  it("renders null/undefined vars as empty string", () => {
    expect(applyTokens("a{signOff}b", { signOff: null })).toBe("ab");
    expect(applyTokens("a{signOff}b", { signOff: undefined })).toBe("ab");
  });

  it("renders number vars as their string form", () => {
    expect(applyTokens("{count} items", { count: 3 })).toBe("3 items");
  });

  it("preserves non-string leaf values (numbers, booleans, null)", () => {
    expect(applyTokens({ count: 3, ok: true, none: null }, { firstName: "Ada" })).toEqual({
      count: 3,
      ok: true,
      none: null,
    });
  });

  it("preserves Date instances rather than walking into them", () => {
    const d = new Date("2026-05-24T00:00:00Z");
    const result = applyTokens({ when: d, label: "{firstName}" }, { firstName: "Ada" });
    expect(result.when).toBe(d);
    expect(result.label).toBe("Ada");
  });

  it("preserves Map instances rather than walking into them", () => {
    const m = new Map([["k", "v"]]);
    const result = applyTokens({ data: m, label: "{firstName}" }, { firstName: "Ada" });
    expect(result.data).toBe(m);
    expect(result.label).toBe("Ada");
  });

  it("skips strings with no curly brace (fast path)", () => {
    expect(applyTokens("no tokens here", { firstName: "Ada" })).toBe("no tokens here");
  });
});
