import { describe, expect, it } from "vitest";

import { parseEmailList } from "./previewRecipients";

describe("parseEmailList", () => {
  it("returns an empty array for undefined input", () => {
    expect(parseEmailList(undefined)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseEmailList("")).toEqual([]);
  });

  it("returns an empty array for a whitespace-only string", () => {
    expect(parseEmailList("   ")).toEqual([]);
  });

  it("parses a single valid address", () => {
    expect(parseEmailList("ada@example.com")).toEqual(["ada@example.com"]);
  });

  it("parses multiple comma-separated addresses", () => {
    expect(parseEmailList("ada@example.com,grace@example.com")).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("trims whitespace around each entry", () => {
    expect(parseEmailList("  ada@example.com , grace@example.com  ")).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("lowercases all entries", () => {
    expect(parseEmailList("Ada@Example.COM,GRACE@EXAMPLE.COM")).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("filters out entries with no @ character", () => {
    expect(parseEmailList("notanemail,ada@example.com,alsonotanemail")).toEqual([
      "ada@example.com",
    ]);
  });

  it("filters out empty entries from trailing or double commas", () => {
    expect(parseEmailList("ada@example.com,,grace@example.com,")).toEqual([
      "ada@example.com",
      "grace@example.com",
    ]);
  });

  it("preserves plus-addressing (stripping is the caller's responsibility)", () => {
    expect(parseEmailList("ada+alias@example.com")).toEqual(["ada+alias@example.com"]);
  });
});
