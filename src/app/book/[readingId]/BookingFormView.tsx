import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import { BookingPageStack, type BookingPageStackItem, shownStackItems } from "@/components/BookingPageStack";
import { GiftFold, type GiftFoldProps } from "@/components/GiftFold";
import { GiftModeProvider } from "@/components/GiftMode/GiftModeContext";
import { GiftModeNote, type GiftModeNoteProps } from "@/components/GiftMode/GiftModeNote";
import { GiftPriceLine } from "@/components/GiftMode/GiftPriceLine";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";
import type { NotesFooterProps, NotesNavProps } from "@/components/Notes/NotesShell";
import { PortableTextContent } from "@/components/PortableTextContent";
import {
  type BookingPageParts,
  type BookingSectionView,
  readingBlockParts,
  type ReadingBlockProps,
  sectionStackItem,
} from "@/components/ReadingBlock";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export type BookingFormViewSection = BookingSectionView;

export type BookingFormViewProps = {
  nav: NotesNavProps;
  footer?: NotesFooterProps;
  backHref: string;
  backLabel?: string;
  reading: { slug: string; tag: string; name: string; priceLabel: string };
  readingBlock: ReadingBlockProps;
  sections: { aboveForm: BookingFormViewSection[]; belowForm: BookingFormViewSection[] };
  copy: {
    title?: string;
    titleEditTarget?: string;
    intro: SanityPortableTextBlock[];
    introEditTarget?: string;
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
  footer,
  backHref,
  backLabel,
  reading,
  readingBlock,
  sections,
  copy,
  form,
  gift,
  giftFold,
}: BookingFormViewProps) {
  const parts: BookingPageParts = {
    ...readingBlockParts(readingBlock),
    giftRowSection: giftFold ? <GiftFold {...giftFold} /> : null,
    introSection: (
      <>
        {copy.title ? <BookingPageHeading title={copy.title} editTarget={copy.titleEditTarget} /> : null}
        <div className="max-w-[50ch]" data-sanity={copy.introEditTarget}>
          <PortableTextContent value={copy.intro} bullets="checkmarks" />
        </div>
      </>
    ),
  };
  const stackItem = (section: BookingFormViewSection) => sectionStackItem(section, parts, reading.slug);
  const aboveCard: BookingPageStackItem[] = [
    ...sections.aboveForm.map(stackItem),
    { key: "form", form: true, node: <IntakeForm readingId={reading.slug} readingName={reading.name} {...form} /> },
  ];
  const belowCard = shownStackItems(sections.belowForm.map(stackItem));

  const view = (
    <HeaderBackProvider>
      <BookingPageShell
        nav={nav}
        footer={footer}
        backHref={backHref}
        backLabel={backLabel}
        readingTag={reading.tag}
        readingName={reading.name}
        readingPrice={reading.priceLabel}
        priceLine={
          gift ? (
            <GiftPriceLine giftLabel={gift.priceLine} readingPrice={reading.priceLabel} />
          ) : undefined
        }
        belowCard={
          belowCard.length > 0 ? (
            <BookingPageStack items={belowCard} />
          ) : undefined
        }
      >
        {gift ? <GiftModeNote {...gift.noteCard} /> : null}
        <BookingPageStack items={aboveCard} />
      </BookingPageShell>
    </HeaderBackProvider>
  );

  return gift ? <GiftModeProvider>{view}</GiftModeProvider> : view;
}
