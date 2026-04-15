import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Mic, Check } from 'lucide-react';
import { GoldDivider } from '@/components/GoldDivider';
import { StarField } from '@/components/StarField';
import { CelestialOrb } from '@/components/CelestialOrb';
import { Footer } from '@/components/Footer';
import { BookingForm } from '@/components/BookingForm';
import { READINGS, getReadingById } from '@/data/readings';
import {
  fetchReadingSlugs,
  fetchReading,
  fetchBookingPage,
} from '@/lib/sanity/fetch';
import { PAGE_ORBS } from '@/lib/celestialPresets';

export async function generateStaticParams() {
  const sanitySlugs = await fetchReadingSlugs();
  if (sanitySlugs.length > 0) {
    return sanitySlugs.map((s) => ({ readingId: s.slug }));
  }
  return READINGS.map((reading) => ({ readingId: reading.id }));
}

type BookingPageProps = {
  params: Promise<{ readingId: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;

  const [sanityReading, bookingPage] = await Promise.all([
    fetchReading(readingId),
    fetchBookingPage(),
  ]);

  const reading = sanityReading
    ? {
        tag: sanityReading.tag,
        name: sanityReading.name,
        subtitle: sanityReading.subtitle,
        price: sanityReading.priceDisplay,
        bookingSummary: sanityReading.bookingSummary,
        includes: sanityReading.includes,
        stripePaymentLink: sanityReading.stripePaymentLink ?? '',
      }
    : getReadingById(readingId);

  if (!reading) {
    notFound();
  }

  const emailLabel = bookingPage?.emailLabel ?? 'Your Email Address';
  const emailDisclaimer =
    bookingPage?.emailDisclaimer ??
    'Your email is only used for this reading. I\u2019ll never share it.';
  const paymentButtonText =
    bookingPage?.paymentButtonText ?? 'Continue to Payment';
  const securityNote =
    bookingPage?.securityNote ?? 'Secure checkout \u00b7 Your details are safe';
  const closingMessage =
    bookingPage?.closingMessage ??
    'I can\u2019t wait to connect with you through your reading.\nWith love, Josephine \u2726';
  const deliveryNote =
    bookingPage?.deliveryNote ??
    'You\u2019ll receive your voice note and PDF within 7 days of payment.';

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={50} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <header className="relative z-10 max-w-5xl mx-auto px-6 pt-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-body text-sm text-j-text-muted hover:text-j-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <Link href="/">
          <Image
            src="/images/header-logo.png"
            alt="Josephine Soul Readings"
            width={60}
            height={30}
            priority
            className="h-auto w-[clamp(120px,8vw,160px)]"
          />
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body">
            ✦ {reading.tag}
          </span>
          <h1 className="font-display text-[clamp(2rem,5vw,3rem)] font-light italic text-j-text-heading leading-tight mt-2">
            {reading.name}
          </h1>
          <p className="font-display text-2xl italic text-j-accent mt-2">
            {reading.price}
          </p>

          <p className="font-display text-lg italic text-j-text leading-relaxed mt-6">
            {reading.bookingSummary}
          </p>

          <GoldDivider className="my-8" />

          <h2 className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted mb-4">
            What&rsquo;s included
          </h2>
          <ul className="space-y-3">
            {reading.includes.map((item, index) => (
              <li key={index} className="flex gap-3">
                <Check
                  className="w-4 h-4 text-j-accent mt-0.5 shrink-0"
                  strokeWidth={2}
                />
                <span className="font-body text-sm text-j-text leading-relaxed">
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <Clock className="w-4 h-4 text-j-accent mt-0.5 shrink-0" />
              <p className="font-body text-sm text-j-text-muted leading-relaxed">
                {deliveryNote}
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <Mic className="w-4 h-4 text-j-accent mt-0.5 shrink-0" />
              <p className="font-body text-sm text-j-text-muted leading-relaxed">
                Detailed voice note recording + a supporting PDF created
                entirely for you.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-j-ivory border border-j-border-subtle rounded-[20px] p-8 shadow-j-soft">
            <p className="font-body text-sm text-j-text-muted leading-relaxed mb-6">
              You&rsquo;re one step away from your reading. Please enter your
              email below and I&rsquo;ll send you everything you need once your
              booking is confirmed.
            </p>

            <BookingForm
              reading={{
                subtitle: reading.subtitle,
                price: reading.price,
                stripePaymentLink: reading.stripePaymentLink,
              }}
              content={{
                emailLabel,
                emailDisclaimer,
                paymentButtonText,
                securityNote,
              }}
            />
          </div>

          <p className="font-display text-base italic text-j-text text-center mt-8 whitespace-pre-line">
            {closingMessage}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
