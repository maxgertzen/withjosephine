import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import { NavigationButton } from "@/components/NavigationButton";
import { ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import { generateReadingStaticParams, getReadingById } from "@/data/readings";
import { BOOKING_ROUTES } from "@/lib/booking/constants";
import { fetchBookingForm, fetchBookingPage, fetchReading } from "@/lib/sanity/fetch";
import { buildOpenGraph } from "@/lib/seoMetadata";

export { generateReadingStaticParams as generateStaticParams };

type LetterPageProps = {
  params: Promise<{ readingId: string }>;
};

export async function generateMetadata({ params }: LetterPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const [sanityReading, bookingPage] = await Promise.all([
    fetchReading(readingId),
    fetchBookingPage(),
  ]);

  const readingName = (sanityReading ?? getReadingById(readingId))?.name;
  const title =
    sanityReading?.seo?.metaTitle ??
    bookingPage?.seo?.metaTitle ??
    (readingName ? `Tell me about you — ${readingName}` : "Tell me about you — Josephine");
  const description =
    sanityReading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "A short note from Josephine before you share your details.";
  const seo = sanityReading?.seo ?? bookingPage?.seo;

  return { title, description, openGraph: buildOpenGraph(seo), robots: { index: false, follow: false } };
}

export default async function LetterPage({ params }: LetterPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingForm] = await Promise.all([
    fetchReading(readingId),
    fetchBookingForm(),
  ]);

  const reading = sanityReading
    ? { slug: sanityReading.slug }
    : (() => {
        const fallback = getReadingById(readingId);
        return fallback ? { slug: readingId } : null;
      })();

  if (!reading) {
    notFound();
  }

  const entry = bookingForm?.entryPageContent ?? {};
  const letterOpener = entry.letterOpener ?? ENTRY_PAGE_DEFAULTS.letterOpener;
  const letterBridge = entry.letterBridge ?? ENTRY_PAGE_DEFAULTS.letterBridge;
  const letterClosing = entry.letterClosing ?? ENTRY_PAGE_DEFAULTS.letterClosing;
  const dropCapCta = entry.dropCapCta ?? ENTRY_PAGE_DEFAULTS.dropCapCta;
  const dropCapCaption = entry.dropCapCaption ?? ENTRY_PAGE_DEFAULTS.dropCapCaption;
  const aboutJosephineLinkText =
    entry.aboutJosephineLinkText ?? ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText;

  const ctaFirstChar = dropCapCta.charAt(0);
  const ctaRest = dropCapCta.slice(1);

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader
        backHref={BOOKING_ROUTES.entry(reading.slug)}
        aboutLinkText={aboutJosephineLinkText}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        <div className="relative">
          <div className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-soft px-6 py-12 md:px-10 md:py-14">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
            />

            <div className="relative flex justify-center mb-6">
              <Image
                src="/images/logo-main.webp"
                alt=""
                width={280}
                height={280}
                aria-hidden="true"
                className="h-auto w-[110px] min-[375px]:w-[140px]"
              />
            </div>

            <p className="relative font-display italic text-[1.25rem] md:text-[1.4rem] leading-snug text-j-text-heading mb-6">
              {letterOpener}
            </p>

            <p className="relative font-display italic text-[1.05rem] text-j-text-muted mb-8">
              {letterBridge}
            </p>

            <hr
              aria-hidden="true"
              className="relative h-px w-3/5 border-0 bg-gradient-to-r from-transparent via-j-accent/40 to-transparent mb-6"
            />

            <p className="relative font-display italic text-[1.25rem] leading-snug text-j-rose text-center mb-6 whitespace-pre-line">
              {letterClosing}
            </p>

            <NavigationButton
              href={BOOKING_ROUTES.intake(reading.slug)}
              aria-label={`${dropCapCta} — go to intake form`}
              className="relative group block w-max max-w-full mx-auto px-4 py-3 font-display italic font-medium text-2xl text-j-deep leading-tight tracking-tight text-center border-b border-transparent hover:border-j-accent transition-colors"
              style={{ minHeight: "56px" }}
            >
              <span
                aria-hidden="true"
                className="font-display italic font-medium text-[3rem] leading-none text-j-accent align-[-0.15em] mr-[0.04em] group-hover:text-j-accent-light transition-colors"
              >
                {ctaFirstChar}
              </span>
              <span>{ctaRest}</span>
            </NavigationButton>

            <span className="relative block font-body text-[13px] leading-relaxed text-j-text-muted text-center mt-2 max-w-[320px] mx-auto">
              {dropCapCaption}
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
