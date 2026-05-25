import { BookingFlowHeader } from "@/components/BookingFlowHeader";
import { Footer } from "@/components/Footer";
import type { GiftIntakePageContent } from "@/data/defaults";

export type GiftIntakePagePreviewState = { kind: "welcome" } | { kind: "return" };

export type GiftIntakePagePreviewProps = {
  copy: GiftIntakePageContent;
  state: GiftIntakePagePreviewState;
  fixtureReadingName: string;
};

export function GiftIntakePagePreview({
  copy,
  state,
  fixtureReadingName,
}: GiftIntakePagePreviewProps) {
  const heading = state.kind === "welcome" ? copy.headingWelcome : copy.heading;
  const lede = copy.lede.replace(/\{readingName\}/g, fixtureReadingName);

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <BookingFlowHeader backHref="/" />

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <article className="relative bg-j-ivory border border-j-blush rounded-sm shadow-j-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-2 md:inset-3 border border-j-border-gold rounded-[1px]"
          />
          <div className="relative px-6 py-10 md:px-12 md:py-14">
            <p className="font-body text-[0.75rem] font-semibold tracking-[0.22em] uppercase text-j-accent mb-3">
              {copy.eyebrow}
            </p>
            <h1 className="font-display italic font-medium text-[clamp(1.85rem,5vw,2.25rem)] leading-tight text-j-text-heading mb-3">
              {heading}
            </h1>
            <p className="font-body text-base text-j-text leading-relaxed mb-8 whitespace-pre-line">
              {lede}
            </p>
            <div className="border border-dashed border-j-border-subtle rounded-sm px-6 py-10 text-center">
              <p className="font-body text-sm text-j-text-muted">
                Intake form fields render here based on the selected reading.
              </p>
              <p className="font-body text-xs text-j-text-muted mt-2">
                Form fields are edited under Form Building Blocks &rarr; Form Sections.
              </p>
            </div>
          </div>
        </article>
        <Footer />
      </main>
    </div>
  );
}
