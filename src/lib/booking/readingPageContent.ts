import { READING_PAGE_DEFAULTS } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import type { SanityBookingForm } from "@/lib/sanity/types";

export function readingPageContent(bookingForm: SanityBookingForm | null) {
  return withNonBlankOverrides(READING_PAGE_DEFAULTS, bookingForm?.readingPageContent);
}
