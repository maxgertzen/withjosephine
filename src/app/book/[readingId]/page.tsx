import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Mic, Check } from "lucide-react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { READINGS, getReadingById } from "@/data/readings";
import { inputClasses, labelClasses } from "@/lib/formStyles";
import { PAGE_ORBS } from "@/lib/celestialPresets";

export function generateStaticParams() {
  return READINGS.map((reading) => ({ readingId: reading.id }));
}

type BookingPageProps = {
  params: Promise<{ readingId: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const { readingId } = await params;
  const reading = getReadingById(readingId);

  if (!reading) {
    notFound();
  }

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
          <span className="font-display text-xl italic text-j-deep">Josephine</span>
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
                <Check className="w-4 h-4 text-j-accent mt-0.5 shrink-0" strokeWidth={2} />
                <span className="font-body text-sm text-j-text leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <Clock className="w-4 h-4 text-j-accent mt-0.5 shrink-0" />
              <p className="font-body text-sm text-j-text-muted leading-relaxed">
                You&rsquo;ll receive your voice note and PDF within 7 days of payment.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <Mic className="w-4 h-4 text-j-accent mt-0.5 shrink-0" />
              <p className="font-body text-sm text-j-text-muted leading-relaxed">
                Detailed voice note recording + a supporting PDF created entirely for you.
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-j-ivory border border-j-border-subtle rounded-[20px] p-8 shadow-j-soft">
            <p className="font-body text-sm text-j-text-muted leading-relaxed mb-6">
              You&rsquo;re one step away from your reading. Please enter your email below
              and I&rsquo;ll send you everything you need once your booking is confirmed.
            </p>

            <form action="#" className="flex flex-col gap-5">
              <div>
                <label htmlFor="booking-email" className={labelClasses}>
                  Your Email Address
                </label>
                <input
                  id="booking-email"
                  type="email"
                  name="email"
                  className={inputClasses}
                />
                <p className="font-body text-xs text-j-muted mt-2">
                  Your email is only used for this reading. I&rsquo;ll never share it.
                </p>
              </div>

              <GoldDivider className="my-2" />

              <div className="flex items-center justify-between">
                <span className="font-body text-sm text-j-text">{reading.subtitle}</span>
                <span className="font-display text-xl italic text-j-accent">{reading.price}</span>
              </div>

              <Button type="submit" size="lg" className="w-full text-center">
                Continue to Payment
              </Button>

              <p className="font-body text-xs text-j-muted text-center">
                Secure checkout · Your details are safe
              </p>
            </form>
          </div>

          <p className="font-display text-base italic text-j-text text-center mt-8">
            I can&rsquo;t wait to connect with you through your reading.
            <br />
            With love, Josephine ✦
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
