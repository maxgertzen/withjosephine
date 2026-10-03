import Image from "next/image";
import Link from "next/link";

import {
  type NotesFooterProps,
  type NotesNavProps,
  NotesShell,
} from "@/components/Notes/NotesShell";

export type NotesIndexItem = { title: string; subtitle: string; href: string; readingTime: string };

export type NotesIndexViewProps = {
  title: string;
  subtitle: string;
  notes: NotesIndexItem[];
  illustrationUrl: string;
  nav: NotesNavProps;
  footer: NotesFooterProps;
};

export function NotesIndexView({
  title,
  subtitle,
  notes,
  illustrationUrl,
  nav,
  footer,
}: NotesIndexViewProps) {
  return (
    <NotesShell nav={nav} footer={footer}>
      <h1 className="m-0 font-display italic font-semibold text-[2.5rem] leading-[1.1] text-j-text-heading md:text-[3.25rem]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 font-body text-[1.0625rem] leading-[1.6] text-j-text-muted">{subtitle}</p>
      ) : null}
      <ul className="mt-12 flex list-none flex-col gap-11 p-0 md:mt-16 md:gap-14">
        {notes.map((note) => (
          <li key={note.href}>
            <Link href={note.href} className="group flex flex-col gap-1.5">
              <span className="font-display italic font-semibold text-[1.625rem] leading-[1.2] text-j-text-heading group-hover:text-j-text-gold-lg md:text-[1.875rem]">
                {note.title}
              </span>
              <span className="font-body text-base leading-[1.6] text-j-text-muted">
                {note.subtitle}
              </span>
              <span className="font-body text-[0.8125rem] text-j-text-muted">
                {note.readingTime}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Image
        src={illustrationUrl}
        alt=""
        width={640}
        height={360}
        className="mx-auto mt-14 block h-auto w-60 md:mt-20 md:w-80"
      />
    </NotesShell>
  );
}
