import { describe, expect, it } from "vitest";

import { hasText, paragraphBlocks } from "./paragraphBlocks";

const PRESENTATION_SOURCE_MAP_MARKER = "​‌‍﻿".repeat(10);

describe("hasText", () => {
  it("is true when a paragraph has words", () => {
    expect(hasText(paragraphBlocks(["", "How you book."]))).toBe(true);
  });

  it("is false for blank paragraphs", () => {
    expect(hasText(paragraphBlocks(["", "   "]))).toBe(false);
  });

  it("is false for a blank paragraph carrying Presentation's invisible source-map marker", () => {
    expect(hasText(paragraphBlocks([` ${PRESENTATION_SOURCE_MAP_MARKER}`]))).toBe(false);
  });
});
