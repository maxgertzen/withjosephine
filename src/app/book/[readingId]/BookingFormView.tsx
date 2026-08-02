import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";
import { PortableTextContent } from "@/components/PortableTextContent";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export type BookingFormViewProps = {
  backHref: string;
  reading: { slug: string; tag: string; name: string; priceLabel: string };
  copy: {
    title: string;
    intro: SanityPortableTextBlock[];
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
        <div className="max-w-[50ch] mb-10">
          <PortableTextContent value={copy.intro} />
        </div>

        <IntakeForm readingId={reading.slug} readingName={reading.name} {...form} />
      </BookingPageShell>
    </HeaderBackProvider>
  );
}
