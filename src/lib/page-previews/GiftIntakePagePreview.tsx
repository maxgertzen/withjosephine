import { BookingPageShell } from "@/components/BookingPageShell";
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
    <BookingPageShell backHref="/">
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
    </BookingPageShell>
  );
}
