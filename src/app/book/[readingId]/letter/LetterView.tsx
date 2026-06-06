import Image from "next/image";

import { TrackedLink } from "@/components/BookingAnalytics";
import { BookingPageShell } from "@/components/BookingPageShell";
import { BOOKING_PAGE_ROUTES } from "@/lib/http/routes";

export type LetterContent = {
  letterOpener: string;
  letterBridge: string;
  letterClosing: string;
  dropCapCta: string;
  dropCapCaption: string;
};

export type LetterReading = {
  slug: string;
};

export type LetterViewProps = {
  reading: LetterReading;
  letterContent: LetterContent;
  aboutJosephineLinkText: string;
};

export function LetterView({ reading, letterContent, aboutJosephineLinkText }: LetterViewProps) {
  const ctaFirstChar = letterContent.dropCapCta.charAt(0);
  const ctaRest = letterContent.dropCapCta.slice(1);

  return (
    <BookingPageShell
      backHref={BOOKING_PAGE_ROUTES.entry(reading.slug)}
      aboutLinkText={aboutJosephineLinkText}
      variant="letter"
    >
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
        {letterContent.letterOpener}
      </p>

      <p className="relative font-display italic text-[1.05rem] text-j-text-muted mb-8">
        {letterContent.letterBridge}
      </p>

      <hr
        aria-hidden="true"
        className="relative h-px w-3/5 border-0 bg-gradient-to-r from-transparent via-j-accent/40 to-transparent mb-6"
      />

      <p className="relative font-display italic text-[1.25rem] leading-snug text-j-rose text-center mb-6 whitespace-pre-line">
        {letterContent.letterClosing}
      </p>

      <TrackedLink
        href={BOOKING_PAGE_ROUTES.intake(reading.slug)}
        event="cta_click_intake"
        properties={{ reading_id: reading.slug, position: "drop-cap" }}
        aria-label={`${letterContent.dropCapCta}, go to intake form`}
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
      </TrackedLink>

      <span className="relative block font-body text-[13px] leading-relaxed text-j-text-muted text-center mt-2 max-w-[320px] mx-auto">
        {letterContent.dropCapCaption}
      </span>
    </BookingPageShell>
  );
}
