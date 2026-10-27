import { READING_PAGE_DEFAULTS } from "@/data/defaults";
import { pickDefined } from "@/lib/sanity/pickDefined";
import type { SanityBookingForm } from "@/lib/sanity/types";

export function readingPageContent(bookingForm: SanityBookingForm | null) {
  return { ...READING_PAGE_DEFAULTS, ...pickDefined(bookingForm?.readingPageContent ?? {}) };
}
