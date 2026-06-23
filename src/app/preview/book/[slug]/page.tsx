import type { Metadata } from "next";

import { BookingEntryView } from "@/app/book/[readingId]/BookingEntryView";
import { deriveBookingEntryProps } from "@/app/book/[readingId]/deriveBookingEntryProps";
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

  const props = deriveBookingEntryProps({
    readingId: slug,
    sanityReading,
    bookingPage,
    bookingForm,
  });

  if (!props) {
    return (
      <p className="font-body text-base text-j-text-muted p-8">
        Preview unavailable: no reading found for slug &ldquo;{slug}&rdquo;.
      </p>
    );
  }

  return <BookingEntryView {...props} />;
}
