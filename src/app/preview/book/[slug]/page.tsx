import type { Metadata } from "next";

import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";

import { BookingPreviewUnavailable } from "./BookingPreviewUnavailable";
import { loadPreviewBookingFormProps } from "./loadPreviewBookingFormProps";

export const metadata: Metadata = {
  title: "Preview: Booking Page",
  robots: { index: false, follow: false },
};

type BookingPreviewProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookingPagePreview({ params }: BookingPreviewProps) {
  const { slug } = await params;
  const props = await loadPreviewBookingFormProps(slug);
  if (!props) return <BookingPreviewUnavailable slug={slug} />;
  return <BookingFormView {...props} />;
}
