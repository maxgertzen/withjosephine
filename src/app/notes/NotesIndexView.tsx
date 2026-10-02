import Link from "next/link";

import { type NotesFooterProps, NotesShell } from "@/components/Notes/NotesShell";

export type NotesIndexItem = { title: string; subtitle: string; href: string; readingTime: string };

export type NotesIndexViewProps = {
  title: string;
  subtitle: string;
  notes: NotesIndexItem[];
  footer: NotesFooterProps;
};

export function NotesIndexView({ title, subtitle, notes, footer }: NotesIndexViewProps) {
  return (
    <NotesShell footer={footer}>
      <h1 className="m-0 font-display italic font-semibold text-[2.5rem] leading-[1.1] text-j-text-heading md:text-[3.25rem]">
        {title}
      </h1>
      <p className="mt-3 font-body text-[1.0625rem] leading-[1.6] text-j-text-muted">{subtitle}</p>
      <ul className="mt-6 flex list-none flex-col p-0">
        {notes.map((note) => (
          <li key={note.href} className="border-t border-j-border-subtle last:border-b">
            <Link href={note.href} className="group flex flex-col gap-1.5 py-6">
              <span className="font-display italic font-semibold text-[1.625rem] leading-[1.2] text-j-text-heading group-hover:text-j-text-gold-lg">
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
    </NotesShell>
  );
}
