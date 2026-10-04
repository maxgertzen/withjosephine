import { loadBookingFormViewProps } from "@/app/book/[readingId]/loadBookingFormViewProps";

export function loadPreviewBookingFormProps(slug: string) {
  return loadBookingFormViewProps(slug, "preview");
}
