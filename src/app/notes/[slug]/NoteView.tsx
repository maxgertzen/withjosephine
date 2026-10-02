import Image from "next/image";
import Link from "next/link";

import { ListenButton } from "@/components/Notes/ListenButton";
import { NoteBody } from "@/components/Notes/NoteBody";
import { type NotesFooterProps, type NotesNavProps, NotesShell } from "@/components/Notes/NotesShell";
import { StarMark } from "@/components/Notes/StarMark";
import { NOTES_PATH } from "@/lib/notes/notes";
import type { NoteBodyBlock, NoteSummary } from "@/lib/notes/types";

export type NoteEnding = {
  leadIn?: string;
  readingName: string;
  readingSlug: string;
  price?: string;
  line?: string;
  button: string;
  href: string;
};

type MoreNotesProps = { label: string; notes: (NoteSummary & { href: string })[]; seeAll?: string };

export type NoteViewProps = {
  slug: string;
  backLabel: string;
  title: string;
  subtitle: string;
  author: { name: string; line: string; photoUrl?: string };
  listen?: { src: string; label: string; length?: string };
  body: NoteBodyBlock[];
  signOff: string;
  updated?: string;
  ending?: NoteEnding;
  moreNotes?: MoreNotesProps;
  nav: NotesNavProps;
  footer: NotesFooterProps;
};

function EndCard({ ending, slug }: { ending: NoteEnding; slug: string }) {
  return (
    <div>
      {ending.leadIn ? (
        <p className="m-0 mb-4 text-center font-display italic text-2xl text-j-text">
          {ending.leadIn}
        </p>
      ) : null}
      <div className="rounded-[16px] border border-j-border-subtle bg-j-ivory p-6 shadow-j-soft">
        <p className="m-0 font-display italic font-semibold text-[1.75rem] leading-[1.15] text-j-text-heading">
          {ending.readingName}
        </p>
        {ending.price ? (
          <p className="mt-1 mb-0 font-display font-medium text-2xl text-j-text-gold-lg">
            {ending.price}
          </p>
        ) : null}
        {ending.line ? (
          <p className="mt-3 mb-0 font-body text-base leading-[1.6] text-j-text">{ending.line}</p>
        ) : null}
        <Link
          href={ending.href}
          data-mp-event="article_reading_click"
          data-mp-note={slug}
          data-mp-reading-id={ending.readingSlug}
          data-mp-position="card"
          className="mt-5 flex min-h-12 items-center justify-center rounded-[var(--j-btn-radius)] bg-j-deep px-6 font-body text-[0.9375rem] font-medium tracking-[0.02em] text-j-cream transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-deep"
        >
          {ending.button}
        </Link>
      </div>
    </div>
  );
}

function MoreNotes({ moreNotes, slug }: { moreNotes: MoreNotesProps; slug: string }) {
  return (
    <nav aria-label={moreNotes.label} className="flex flex-col">
      <p className="m-0 mb-1 font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-j-text-gold">
        {moreNotes.label}
      </p>
      {moreNotes.notes.map((note) => (
        <Link
          key={note.slug}
          href={note.href}
          data-mp-event="article_note_click"
          data-mp-note={slug}
          data-mp-target={note.slug}
          data-mp-position="more_notes"
          className="flex min-h-11 items-center border-t border-j-border-subtle py-4 font-display italic font-medium text-[1.375rem] leading-[1.25] text-j-text-heading hover:text-j-text-gold-lg"
        >
          {note.title}
        </Link>
      ))}
      {moreNotes.seeAll ? (
        <Link
          href={NOTES_PATH}
          className="flex min-h-11 items-center border-t border-j-border-subtle py-4 font-body text-[0.9375rem] font-medium text-j-text-gold hover:underline"
        >
          {moreNotes.seeAll}&nbsp;&#8250;
        </Link>
      ) : null}
    </nav>
  );
}

export function NoteView({
  slug,
  backLabel,
  title,
  subtitle,
  author,
  listen,
  body,
  signOff,
  updated,
  ending,
  moreNotes,
  nav,
  footer,
}: NoteViewProps) {
  return (
    <NotesShell nav={nav} footer={footer}>
      <article>
        <Link
          href={NOTES_PATH}
          className="inline-flex min-h-11 items-center font-body text-sm font-medium tracking-[0.02em] text-j-text-gold hover:underline"
        >
          &#8249;&nbsp; {backLabel}
        </Link>
        <h1 className="mt-6 mb-0 font-display italic font-semibold text-[2rem] leading-[1.15] text-j-text-heading [text-wrap:balance] md:text-[2.75rem]">
          {title}
        </h1>
        <p className="mt-3 mb-0 font-display italic text-2xl leading-[1.3] text-j-text">
          {subtitle}
        </p>

        <div className="mt-6 flex items-center gap-3">
          {author.photoUrl ? (
            <span className="size-10 shrink-0 overflow-hidden rounded-full border border-j-border-gold bg-j-warm">
              <Image
                src={author.photoUrl}
                alt=""
                width={40}
                height={40}
                sizes="40px"
                className="block size-full max-w-none object-cover object-[50%_12%] scale-[1.2] origin-[50%_38%]"
              />
            </span>
          ) : null}
          <p className="m-0 flex flex-col">
            <span className="font-body text-[0.9375rem] font-medium text-j-text">
              {author.name}
            </span>
            <span className="font-body text-sm text-j-text-muted">{author.line}</span>
          </p>
        </div>
        {listen ? <ListenButton {...listen} /> : null}

        <NoteBody blocks={body} noteSlug={slug} />

        <p className="mt-10 mb-0 font-display italic text-[1.75rem] leading-[1.2] text-j-text-gold-lg">
          {signOff}
        </p>
        {updated ? (
          <p className="mt-2 mb-0 font-body text-sm text-j-text-muted">{updated}</p>
        ) : null}
      </article>

      {ending || moreNotes ? (
        <div className="mt-12 flex flex-col gap-10">
          <div
            aria-hidden="true"
            data-testid="note-divider"
            className="mb-2 flex items-center justify-center gap-2.5 text-j-ornament"
          >
            <span className="block h-px w-12 bg-j-border-gold" />
            <StarMark size={12} />
            <span className="block h-px w-12 bg-j-border-gold" />
          </div>
          {ending ? <EndCard ending={ending} slug={slug} /> : null}
          {moreNotes ? <MoreNotes moreNotes={moreNotes} slug={slug} /> : null}
        </div>
      ) : null}
    </NotesShell>
  );
}
