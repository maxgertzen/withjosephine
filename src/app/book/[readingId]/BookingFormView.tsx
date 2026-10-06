import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import { GiftFold, type GiftFoldProps } from "@/components/GiftFold";
import { GiftModeProvider } from "@/components/GiftMode/GiftModeContext";
import { GiftModeNote, type GiftModeNoteProps } from "@/components/GiftMode/GiftModeNote";
import { GiftPriceLine } from "@/components/GiftMode/GiftPriceLine";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";
import type { NotesNavProps } from "@/components/Notes/NotesShell";
import { PortableTextContent } from "@/components/PortableTextContent";
import { ReadingBlock, type ReadingBlockProps } from "@/components/ReadingBlock";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export type BookingFormViewProps = {
  nav: NotesNavProps;
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
  giftFold?: GiftFoldProps;
};

export function BookingFormView({
  nav,
  backHref,
  reading,
  readingBlock,
  copy,
  form,
  gift,
  giftFold,
}: BookingFormViewProps) {
  const view = (
    <HeaderBackProvider>
      <BookingPageShell
        nav={nav}
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
        {giftFold ? <GiftFold {...giftFold} /> : null}
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
