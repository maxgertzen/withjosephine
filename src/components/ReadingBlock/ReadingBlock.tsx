import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ReadingFact } from "@/data/defaults";
import type { MappedFaqItem } from "@/lib/sanity/mappers";
import { eyebrowClasses, smallCapsClasses } from "@/lib/textStyles";

import { OtherReadingLink } from "./OtherReadingLink";
import { ReadingAccordion } from "./ReadingAccordion";
import { ReadingFold } from "./ReadingFold";

export type OtherReading = { name: string; price: string; line: string; slug: string };

export type ReadingBlockProps = {
  slug: string;
  foldRowLabel: string;
  eyebrow: string;
  lead: string;
  body?: string;
  facts: ReadingFact[];
  reader: { name: string; line: string; imageUrl: string };
  included: { title: string; items: string[] };
  howItWorks: { title: string; paragraphs: string[] };
  questions: { title: string; items: MappedFaqItem[] };
  otherReadings: { title: string; readings: OtherReading[] };
  notes?: { title: string; items: { title: string; slug: string; href: string }[] };
};

const ANSWER_CLASS = "font-body text-base leading-[1.7] text-j-text-muted mb-3";

function ReadingContent(props: ReadingBlockProps) {
  const { slug, eyebrow, lead, body, facts, reader, included, howItWorks, questions, otherReadings, notes } =
    props;
  return (
    <>
      <p className={`${eyebrowClasses} mb-3`}>{eyebrow}</p>
      <p className="font-display italic text-[1.35rem] leading-[1.4] text-j-text mb-3">{lead}</p>
      {body ? <p className="font-body text-base leading-[1.7] text-j-text mb-2">{body}</p> : null}

      {facts.length > 0 ? (
        <dl
          className="mt-6 grid border-y border-j-border-subtle"
          style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}
        >
          {facts.map((fact, index) => (
            <div
              key={index}
              className={`flex flex-col gap-1 px-1 py-3.5 text-center ${index > 0 ? "border-l border-j-border-subtle" : ""}`}
            >
              <dt className="font-body uppercase text-[0.68rem] tracking-[0.18em] text-j-text-muted">
                {fact.label}
              </dt>
              <dd className="m-0 font-display italic text-[1.15rem] leading-[1.2] text-j-text">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-6 flex items-center gap-[0.9rem]">
        <span className="size-14 shrink-0 overflow-hidden rounded-full border border-j-border-gold bg-j-warm">
          <Image
            src={reader.imageUrl}
            alt=""
            width={56}
            height={56}
            sizes="56px"
            className="block size-full max-w-none object-cover object-[50%_12%] scale-[1.2] origin-[50%_38%]"
          />
        </span>
        <p className="m-0 flex flex-col">
          <span className="font-display italic text-[1.2rem] text-j-text-heading">{reader.name}</span>
          <span className="font-body text-sm text-j-text-muted">{reader.line}</span>
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {included.items.length > 0 ? (
          <ReadingAccordion id={`${slug}-included`} title={included.title}>
            <ul className="m-0 mb-3 flex list-none flex-col gap-3 p-0">
              {included.items.map((item, index) => (
                <li key={index} className="flex gap-3 font-body text-base leading-[1.6] text-j-text-muted">
                  <Check aria-hidden="true" className="mt-[0.3rem] size-4 shrink-0 text-j-ornament" strokeWidth={2} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ReadingAccordion>
        ) : null}
        {howItWorks.paragraphs.length > 0 ? (
          <ReadingAccordion id={`${slug}-how`} title={howItWorks.title}>
            {howItWorks.paragraphs.map((paragraph, index) => (
              <p key={index} className={ANSWER_CLASS}>
                {paragraph}
              </p>
            ))}
          </ReadingAccordion>
        ) : null}
        {questions.items.length > 0 ? (
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
        ) : null}
      </div>

      {notes ? (
        <nav aria-label={notes.title} className="mt-7 flex flex-col">
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
      ) : null}

      {otherReadings.readings.length > 0 ? (
        <nav
          aria-label={otherReadings.title}
          className="mt-7 rounded-[16px] border border-j-border-subtle bg-j-warm p-5"
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
      ) : null}
    </>
  );
}

export function ReadingBlock(props: ReadingBlockProps) {
  return (
    <ReadingFold slug={props.slug} label={props.foldRowLabel}>
      <ReadingContent {...props} />
    </ReadingFold>
  );
}
