import { describe, expect, it } from "vitest";

import { parseDisplayToCents } from "./pricing";

describe("parseDisplayToCents", () => {
  it("parses integer-dollar formats", () => {
    expect(parseDisplayToCents("$0")).toBe(0);
    expect(parseDisplayToCents("$1")).toBe(100);
    expect(parseDisplayToCents("$79")).toBe(7900);
    expect(parseDisplayToCents("$129")).toBe(12900);
    expect(parseDisplayToCents("$1299")).toBe(129900);
  });

  it("parses two-decimal-dollar formats", () => {
    expect(parseDisplayToCents("$0.00")).toBe(0);
    expect(parseDisplayToCents("$1.00")).toBe(100);
    expect(parseDisplayToCents("$79.99")).toBe(7999);
    expect(parseDisplayToCents("$129.50")).toBe(12950);
  });

  it("returns null for malformed inputs", () => {
    expect(parseDisplayToCents("")).toBeNull();
    expect(parseDisplayToCents("79")).toBeNull();
    expect(parseDisplayToCents("$")).toBeNull();
    expect(parseDisplayToCents("$.99")).toBeNull();
    expect(parseDisplayToCents("$79.9")).toBeNull();
    expect(parseDisplayToCents("$79.999")).toBeNull();
    expect(parseDisplayToCents("$1,299")).toBeNull();
    expect(parseDisplayToCents("USD 79")).toBeNull();
    expect(parseDisplayToCents(" $79")).toBeNull();
    expect(parseDisplayToCents("$79 ")).toBeNull();
  });
});
