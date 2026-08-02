import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";

export type BookingFormViewProps = {
  backHref: string;
  reading: { slug: string; tag: string; name: string; priceLabel: string };
  copy: {
    title: string;
    subtitle: string;
    letterOpener: string;
    letterBridge: string;
  };
  form: Omit<IntakeFormProps, "readingId" | "readingName">;
};

export function BookingFormView({ backHref, reading, copy, form }: BookingFormViewProps) {
  return (
    <HeaderBackProvider>
      <BookingPageShell
        backHref={backHref}
        readingTag={reading.tag}
        readingName={reading.name}
        readingPrice={reading.priceLabel}
      >
        <BookingPageHeading title={copy.title} />
        <p className="font-display italic text-[1.05rem] leading-snug text-j-text-muted max-w-[50ch] mb-6">
          {copy.subtitle}
        </p>

        <p className="font-display italic text-[1.25rem] md:text-[1.4rem] leading-snug text-j-text-heading mb-4">
          {copy.letterOpener}
        </p>
        <p className="font-display italic text-[1.05rem] text-j-text-muted mb-10">
          {copy.letterBridge}
        </p>

        <IntakeForm readingId={reading.slug} readingName={reading.name} {...form} />
      </BookingPageShell>
    </HeaderBackProvider>
  );
}
