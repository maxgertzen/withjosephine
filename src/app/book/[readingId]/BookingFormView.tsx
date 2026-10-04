import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import { GiftModeProvider } from "@/components/GiftMode/GiftModeContext";
import { GiftModeNote, type GiftModeNoteProps } from "@/components/GiftMode/GiftModeNote";
import { GiftPriceLine } from "@/components/GiftMode/GiftPriceLine";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";
import { PortableTextContent } from "@/components/PortableTextContent";
import { ReadingBlock, type ReadingBlockProps } from "@/components/ReadingBlock";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export type BookingFormViewProps = {
  backHref: string;
  reading: { slug: string; tag: string; name: string; priceLabel: string };
  readingBlock: ReadingBlockProps;
  copy: {
    title?: string;
    intro: SanityPortableTextBlock[];
  };
  form: Omit<IntakeFormProps, "readingId" | "readingName">;
  gift?: {
    noteCard: GiftModeNoteProps;
    priceLine: string;
  };
};

export function BookingFormView({
  backHref,
  reading,
  readingBlock,
  copy,
  form,
  gift,
}: BookingFormViewProps) {
  const view = (
    <HeaderBackProvider>
      <BookingPageShell
        backHref={backHref}
        readingTag={reading.tag}
        readingName={reading.name}
        readingPrice={reading.priceLabel}
        priceLine={
          gift ? (
            <GiftPriceLine giftLabel={gift.priceLine} readingPrice={reading.priceLabel} />
          ) : undefined
        }
      >
        {gift ? <GiftModeNote {...gift.noteCard} /> : null}
        <ReadingBlock {...readingBlock} />
        {copy.title ? <BookingPageHeading title={copy.title} /> : null}
        <div className="max-w-[50ch] mb-10">
          <PortableTextContent value={copy.intro} />
        </div>

        <IntakeForm readingId={reading.slug} readingName={reading.name} {...form} />
      </BookingPageShell>
    </HeaderBackProvider>
  );

  return gift ? <GiftModeProvider>{view}</GiftModeProvider> : view;
}
