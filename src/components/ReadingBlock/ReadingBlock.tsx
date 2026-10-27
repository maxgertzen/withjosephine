import Link from "next/link";
import type { ReactNode } from "react";

import { IncludedList } from "@/components/IncludedList";
import { PortraitAvatar } from "@/components/PortraitAvatar";
import type { ReadingFact, ReadingFactsLayout } from "@/data/defaults";
import type { BookingPageElement } from "@/lib/booking/pageLayout";
import type { MappedFaqItem } from "@/lib/sanity/mappers";
import { eyebrowClasses, smallCapsClasses } from "@/lib/textStyles";

import { FactsRow } from "./FactsRow";
import { OtherReadingLink } from "./OtherReadingLink";
import { ReadingAccordion } from "./ReadingAccordion";

export type OtherReading = { name: string; price: string; line: string; slug: string };

export type ReadingBlockProps = {
  slug: string;
  eyebrow: string;
  lead: string;
  description: string;
  facts: ReadingFact[];
  factsLayout: ReadingFactsLayout;
  reader: { name: string; line: string; imageUrl?: string; imageEditTarget?: string };
  included: { title: string; items: string[] };
  howItWorks: { title: string; items: string[] };
  questions: { title: string; items: MappedFaqItem[] };
  otherReadings: { title: string; readings: OtherReading[] };
  notes?: { title: string; items: { title: string; slug: string; href: string }[] };
};

export type ReadingBlockElement = Extract<
  BookingPageElement,
  "summary" | "facts" | "reader" | "included" | "howItWorks" | "questions" | "notes" | "otherReadings"
>;

const ANSWER_CLASS = "font-body text-base leading-[1.7] text-j-text-muted mb-3";

function Summary({ eyebrow, lead, description }: ReadingBlockProps) {
  return (
    <div>
      <p className={`${eyebrowClasses} mb-3`}>{eyebrow}</p>
      <p className="font-display italic text-[1.35rem] leading-[1.4] text-j-text mb-3">{lead}</p>
      {description ? <p className="font-body text-base leading-[1.7] text-j-text m-0">{description}</p> : null}
    </div>
  );
}

function Reader({ reader }: ReadingBlockProps) {
  return (
    <div className="flex items-center gap-[0.9rem]">
      {reader.imageUrl ? <PortraitAvatar src={reader.imageUrl} size={56} editTarget={reader.imageEditTarget} /> : null}
      <p className="m-0 flex flex-col">
        <span className="font-display italic text-[1.2rem] text-j-text-heading">{reader.name}</span>
        <span className="font-body text-sm text-j-text-muted">{reader.line}</span>
      </p>
    </div>
  );
}

function Questions({ slug, questions }: ReadingBlockProps) {
  return (
    <ReadingAccordion id={`${slug}-questions`} title={questions.title}>
      {questions.items.map((item) => (
        <div key={item.id} className="mt-5 first:mt-0">
          <h3 className="font-display not-italic font-semibold text-[1.25rem] leading-[1.3] text-j-text-heading mb-1.5">
            {item.question}
          </h3>
          <p className={ANSWER_CLASS}>{item.answer}</p>
        </div>
      ))}
    </ReadingAccordion>
  );
}

function Notes({ slug, notes }: { slug: string; notes: NonNullable<ReadingBlockProps["notes"]> }) {
  return (
    <nav aria-label={notes.title} className="flex flex-col">
      <p className={`${eyebrowClasses} m-0 mb-1`}>{notes.title}</p>
      {notes.items.map((note) => (
        <Link
          key={note.slug}
          href={note.href}
          data-mp-event="article_note_click"
          data-mp-reading-id={slug}
          data-mp-target={note.slug}
          data-mp-position="reading_page"
          className="flex min-h-11 items-center border-t border-j-border-subtle py-3 font-display italic font-medium text-[1.2rem] leading-[1.25] text-j-text-heading hover:text-j-text-gold-lg"
        >
          {note.title}
        </Link>
      ))}
    </nav>
  );
}

function OtherReadings({ otherReadings }: ReadingBlockProps) {
  return (
    <nav
      aria-label={otherReadings.title}
      className="rounded-[16px] border border-j-border-subtle bg-j-warm p-5"
    >
      <p className={`${smallCapsClasses} text-j-text-muted-warm m-0 mb-1`}>{otherReadings.title}</p>
      {otherReadings.readings.map((reading) => (
        <OtherReadingLink key={reading.slug} slug={reading.slug}>
          <span className="font-display italic text-[1.2rem] text-j-text-heading">
            {reading.name} <em className="text-j-text">{reading.price}</em>
          </span>
          <span className="font-body text-[0.9rem] leading-normal text-j-text-muted-warm">
            {reading.line}
          </span>
        </OtherReadingLink>
      ))}
    </nav>
  );
}

export function readingBlockElements(
  props: ReadingBlockProps,
): Record<ReadingBlockElement, ReactNode> {
  const { slug, facts, factsLayout, included, howItWorks, questions, notes, otherReadings } = props;
  return {
    summary: <Summary {...props} />,
    facts: facts.length > 0 ? <FactsRow facts={facts} layout={factsLayout} /> : null,
    reader: <Reader {...props} />,
    included:
      included.items.length > 0 ? (
        <ReadingAccordion id={`${slug}-included`} title={included.title}>
          <IncludedList items={included.items} size="page" className="mb-3" />
        </ReadingAccordion>
      ) : null,
    howItWorks:
      howItWorks.items.length > 0 ? (
        <ReadingAccordion id={`${slug}-how`} title={howItWorks.title}>
          <IncludedList items={howItWorks.items} size="page" className="mb-3" />
        </ReadingAccordion>
      ) : null,
    questions: questions.items.length > 0 ? <Questions {...props} /> : null,
    notes: notes ? <Notes slug={slug} notes={notes} /> : null,
    otherReadings: otherReadings.readings.length > 0 ? <OtherReadings {...props} /> : null,
  };
}
