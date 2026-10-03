import { describe, expect, it, vi } from "vitest";

vi.mock("sanity", () => ({
  defineArrayMember: <T,>(member: T) => member,
  defineField: <T,>(field: T) => field,
  defineType: <T,>(type: T) => type,
}));

vi.mock("../components/NoteUrlInput", () => ({ NoteUrlInput: () => null }));

import { firstBlockIsParagraph } from "./article";

describe("firstBlockIsParagraph", () => {
  it("accepts a body that starts with a paragraph, or is empty", () => {
    expect(firstBlockIsParagraph([{ _type: "block", style: "normal" }])).toBe(true);
    expect(firstBlockIsParagraph([{ _type: "block" }])).toBe(true);
    expect(firstBlockIsParagraph([])).toBe(true);
    expect(firstBlockIsParagraph(undefined)).toBe(true);
  });

  it("warns when the body starts with a heading, quote, image or Plate", () => {
    for (const first of [
      { _type: "block", style: "h2" },
      { _type: "block", style: "blockquote" },
      { _type: "image" },
      { _type: "notePlate" },
    ]) {
      expect(firstBlockIsParagraph([first])).toMatch(/Start with a paragraph/);
    }
  });
});
