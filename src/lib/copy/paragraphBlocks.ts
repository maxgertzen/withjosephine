import { toPlainText } from "@portabletext/react";

import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export function hasText(blocks: SanityPortableTextBlock[]): boolean {
  return toPlainText(blocks).trim() !== "";
}

export function paragraphBlocks(paragraphs: string[]): SanityPortableTextBlock[] {
  return paragraphs.map((text, index) => ({
    _type: "block",
    _key: `fallback-${index}`,
    style: "normal",
    markDefs: [],
    children: [{ _type: "span", _key: `fallback-${index}-0`, text, marks: [] }],
  }));
}
