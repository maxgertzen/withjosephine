import type { Metadata } from "next";

import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";
import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import {
  fetchBookingForm,
  fetchBookingPage,
  fetchLandingPage,
  fetchReading,
  fetchReadings,
} from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Booking Page",
  robots: { index: false, follow: false },
};

type BookingPreviewProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookingPagePreview({ params }: BookingPreviewProps) {
  const { slug } = await params;

  const [sanityReading, sanityReadings, bookingPage, bookingForm, landingPage] = await Promise.all([
    fetchReading(slug),
    fetchReadings(),
    fetchBookingPage(),
    fetchBookingForm(),
    fetchLandingPage(),
  ]);

  const props = deriveBookingFormViewProps({
    readingId: slug,
    sanityReading,
    sanityReadings,
    bookingPage,
    bookingForm,
    landingPage,
  });

  if (!props) {
    return (
      <p className="font-body text-base text-j-text-muted p-8">
        Preview unavailable: no reading or booking form found for slug &ldquo;{slug}&rdquo;.
      </p>
    );
  }

  return <BookingFormView {...props} />;
}
