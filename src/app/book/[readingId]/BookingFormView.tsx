import { HeaderBackProvider } from "@/components/BookingFlowHeader/headerBackContext";
import { BookingPageHeading } from "@/components/BookingPageHeading";
import { BookingPageShell } from "@/components/BookingPageShell";
import {
  type BookingPageElementNodes,
  BookingPageStack,
  renderedElements,
} from "@/components/BookingPageStack";
import { GiftFold, type GiftFoldProps } from "@/components/GiftFold";
import { GiftModeProvider } from "@/components/GiftMode/GiftModeContext";
import { GiftModeNote, type GiftModeNoteProps } from "@/components/GiftMode/GiftModeNote";
import { GiftPriceLine } from "@/components/GiftMode/GiftPriceLine";
import { IntakeForm, type IntakeFormProps } from "@/components/IntakeForm";
import { TestimonialLine } from "@/components/IntakeForm/TestimonialLine";
import type { NotesNavProps } from "@/components/Notes/NotesShell";
import { PortableTextContent } from "@/components/PortableTextContent";
import { readingBlockElements, type ReadingBlockProps } from "@/components/ReadingBlock";
import type { BookingPageLayout } from "@/lib/booking/pageLayout";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export type BookingFormViewProps = {
  nav: NotesNavProps;
  backHref: string;
  reading: { slug: string; tag: string; name: string; priceLabel: string };
  readingBlock: ReadingBlockProps;
  layout: BookingPageLayout;
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
  layout,
  copy,
  form,
  gift,
  giftFold,
}: BookingFormViewProps) {
  const { testimonial, ...formWithoutTestimonial } = form;
  const elements: BookingPageElementNodes = {
    ...readingBlockElements(readingBlock),
    giftRow: giftFold ? <GiftFold {...giftFold} /> : null,
    intro: (
      <>
        {copy.title ? <BookingPageHeading title={copy.title} /> : null}
        <div className="max-w-[50ch]">
          <PortableTextContent value={copy.intro} />
        </div>
      </>
    ),
    testimonial: testimonial ? <TestimonialLine {...testimonial} /> : null,
    form: (
      <IntakeForm
        readingId={reading.slug}
        readingName={reading.name}
        {...formWithoutTestimonial}
        testimonial={layout.testimonialInsideForm ? testimonial : undefined}
      />
    ),
  };
  const belowCard = renderedElements(layout.belowForm, elements);

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
        belowCard={
          belowCard.length > 0 ? (
            <BookingPageStack order={belowCard} elements={elements} />
          ) : undefined
        }
      >
        {gift ? <GiftModeNote {...gift.noteCard} /> : null}
        <BookingPageStack order={[...layout.aboveForm, "form"]} elements={elements} />
      </BookingPageShell>
    </HeaderBackProvider>
  );

  return gift ? <GiftModeProvider>{view}</GiftModeProvider> : view;
}
