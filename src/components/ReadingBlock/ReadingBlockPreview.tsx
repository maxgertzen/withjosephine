import { BookingPageStack } from "@/components/BookingPageStack";
import { DEFAULT_ORDER } from "@/lib/booking/pageLayout";

import { readingBlockElements, type ReadingBlockProps } from "./ReadingBlock";

export function ReadingBlockPreview(props: ReadingBlockProps) {
  return <BookingPageStack order={DEFAULT_ORDER} elements={readingBlockElements(props)} />;
}
