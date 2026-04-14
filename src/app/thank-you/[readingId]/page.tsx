import { notFound } from "next/navigation";
import { Check, Mail, FileText, Clock } from "lucide-react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { READINGS, getReadingById, getRequiredDetails } from "@/data/readings";
import { PAGE_ORBS } from "@/lib/celestialPresets";

export function generateStaticParams() {
  return READINGS.map((reading) => ({ readingId: reading.id }));
}

type ThankYouPageProps = {
  params: Promise<{ readingId: string }>;
};

export default async function ThankYouPage({ params }: ThankYouPageProps) {
  const { readingId } = await params;
  const reading = getReadingById(readingId);

  if (!reading) {
    notFound();
  }

  const requirements = getRequiredDetails(reading);

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[800px] mx-auto px-6 py-20 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
          <Check className="w-10 h-10 text-j-accent" strokeWidth={2.5} />
        </div>

        <h1 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-light italic text-j-text-heading leading-tight">
          Thank you for booking
        </h1>
        <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md mx-auto">
          I&rsquo;m really looking forward to reading for you. This is going to be special.
        </p>

        <div className="mt-10 bg-j-ivory border border-j-border-subtle rounded-[20px] p-6 shadow-j-soft inline-flex items-center gap-6">
          <div className="text-left">
            <span className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted">
              Your Reading
            </span>
            <p className="font-display text-xl italic text-j-text-heading mt-1">
              {reading.name}
            </p>
          </div>
          <span className="font-display text-2xl italic text-j-accent">
            {reading.price}
          </span>
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <h2 className="font-display text-2xl italic text-j-text-heading mb-10">
          What happens next
        </h2>

        <div className="max-w-lg mx-auto flex flex-col gap-8 text-left">
          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-j-accent/10">
              <Mail className="w-5 h-5 text-j-accent" />
            </div>
            <div>
              <h3 className="font-display text-lg italic text-j-text-heading">
                Check your email
              </h3>
              <p className="font-body text-sm text-j-text-muted leading-relaxed mt-1">
                I&rsquo;ll send you a confirmation email within the next hour with a link to your
                intake form.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-j-accent/10">
              <FileText className="w-5 h-5 text-j-accent" />
            </div>
            <div>
              <h3 className="font-display text-lg italic text-j-text-heading">
                Fill in your details
              </h3>
              <p className="font-body text-sm text-j-text-muted leading-relaxed mt-1">
                So I can create your reading, I&rsquo;ll need:
              </p>
              <ul className="mt-2 space-y-1">
                {requirements.map((req, index) => (
                  <li key={index} className="flex gap-2 items-start">
                    <Check className="w-3.5 h-3.5 text-j-accent mt-0.5 shrink-0" strokeWidth={2} />
                    <span className="font-body text-sm text-j-text-muted">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-j-accent/10">
              <Clock className="w-5 h-5 text-j-accent" />
            </div>
            <div>
              <h3 className="font-display text-lg italic text-j-text-heading">
                Receive your reading
              </h3>
              <p className="font-body text-sm text-j-text-muted leading-relaxed mt-1">
                Within 7 days of receiving your details, I&rsquo;ll send you a detailed voice note
                recording and a supporting PDF created entirely for you.
              </p>
            </div>
          </div>
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <p className="font-display text-base italic text-j-text max-w-sm mx-auto">
          I can&rsquo;t wait to connect with you through your reading.
          <br />
          With love, Josephine ✦
        </p>

        <div className="mt-10">
          <Button href="/" variant="ghost" size="lg">
            Return to Home
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
