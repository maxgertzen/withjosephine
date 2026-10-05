import { READING_CARD_LABEL_KEYS, type ReadingCardLabels } from "@/data/defaults";
import { bookingPath } from "@/lib/http/routes";
import { pick } from "@/lib/pick";
import type { MappedReading } from "@/lib/sanity/mappers";

import type { ReadingCardProps } from "./ReadingCard";

export function readingCardProps(reading: MappedReading, labels: ReadingCardLabels): ReadingCardProps {
  return {
    slug: reading.id,
    tag: reading.tag,
    name: reading.name,
    price: reading.price,
    valueProposition: reading.valueProposition,
    briefDescription: reading.briefDescription,
    includes: reading.includes,
    labels: pick(labels, READING_CARD_LABEL_KEYS),
    href: bookingPath(reading.id),
  };
}
