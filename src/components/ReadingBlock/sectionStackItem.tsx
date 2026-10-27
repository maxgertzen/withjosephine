import type { ReactNode } from "react";

import type { BookingPageStackItem } from "@/components/BookingPageStack";
import { type FormTestimonial, TestimonialLine } from "@/components/IntakeForm/TestimonialLine";
import type { BookingPagePart, BookingPageSection } from "@/lib/booking/bookingPageSections";
import type { MappedFaqItem } from "@/lib/sanity/mappers";

import { ListAccordion, QuestionsAccordion } from "./ReadingBlock";

export type BookingSectionView = BookingPageSection<MappedFaqItem, FormTestimonial>;

export type BookingPageParts = Partial<Record<BookingPagePart, ReactNode>>;

export function sectionStackItem(
  section: BookingSectionView,
  parts: BookingPageParts,
  idPrefix: string,
): BookingPageStackItem {
  const id = `${idPrefix}-${section.key}`;
  switch (section.kind) {
    case "part":
      return { key: section.key, node: parts[section.part] };
    case "list":
      return { key: section.key, accordion: true, node: <ListAccordion id={id} title={section.title} items={section.items} /> };
    case "questions":
      return {
        key: section.key,
        accordion: true,
        node: <QuestionsAccordion id={id} title={section.title} items={section.questions} />,
      };
    case "testimonial":
      return { key: section.key, node: <TestimonialLine {...section.testimonial} /> };
  }
}
