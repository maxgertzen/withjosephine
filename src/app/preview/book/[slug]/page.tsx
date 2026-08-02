import type { Metadata } from "next";

import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";
import { deriveBookingFormViewProps } from "@/app/book/[readingId]/deriveBookingFormViewProps";
import { fetchBookingForm, fetchBookingPage, fetchReading } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Booking Page",
  robots: { index: false, follow: false },
};

type BookingPreviewProps = {
  params: Promise<{ slug: string }>;
};

export default async function BookingPagePreview({ params }: BookingPreviewProps) {
  const { slug } = await params;

  const [sanityReading, bookingPage, bookingForm] = await Promise.all([
    fetchReading(slug),
    fetchBookingPage(),
    fetchBookingForm(),
  ]);

  const props = deriveBookingFormViewProps({
    readingId: slug,
    sanityReading,
    bookingPage,
    bookingForm,
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
