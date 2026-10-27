import { BookingPageStack } from "@/components/BookingPageStack";

import { readingBlockParts, type ReadingBlockProps } from "./ReadingBlock";
import { type BookingSectionView, sectionStackItem } from "./sectionStackItem";

export type ReadingBlockPreviewProps = { block: ReadingBlockProps; sections: BookingSectionView[] };

export function ReadingBlockPreview({ block, sections }: ReadingBlockPreviewProps) {
  const parts = readingBlockParts(block);
  return <BookingPageStack items={sections.map((section) => sectionStackItem(section, parts, block.slug))} />;
}
