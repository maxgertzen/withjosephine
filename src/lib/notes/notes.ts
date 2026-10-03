import { toPlainText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

import { NOTES_DEFAULTS, type NotesContent } from "@/data/defaults";
import { ROUTES } from "@/lib/constants";
import { applyTokens } from "@/lib/emails/applyTokens";
import type { SanityNotesState } from "@/lib/sanity/types";

import type { NoteBodyBlock, NoteSummary } from "./types";

export const NOTES_PATH = ROUTES.notes;
const WORDS_PER_MINUTE = 200;
const DESCRIPTION_MAX_LENGTH = 160;

export type NotesLink = { label: string; href: string };

export function notePath(slug: string): string {
  return `${NOTES_PATH}/${slug}`;
}

export function nonBlank(value: string | null | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function isNotesVisible(state: SanityNotesState | null): boolean {
  return state?.settings?.enabled === true && state.publishedCount > 0;
}

export function notesContent(state: SanityNotesState | null): NotesContent {
  const merged = { ...NOTES_DEFAULTS };
  for (const key of Object.keys(NOTES_DEFAULTS) as (keyof NotesContent)[]) {
    merged[key] = nonBlank(state?.settings?.[key]) ?? NOTES_DEFAULTS[key];
  }
  return merged;
}

function notesLink(
  state: SanityNotesState | null,
  labelKey: "footerLinkLabel" | "navLinkLabel",
): NotesLink | undefined {
  if (!isNotesVisible(state)) return undefined;
  return { label: notesContent(state)[labelKey], href: NOTES_PATH };
}

export const notesFooterLink = (state: SanityNotesState | null) => notesLink(state, "footerLinkLabel");
export const notesNavLink = (state: SanityNotesState | null) => notesLink(state, "navLinkLabel");

export function faqNoteLink(
  state: SanityNotesState | null,
  note: NoteSummary | null | undefined,
): (NotesLink & { slug: string }) | undefined {
  if (!note?.slug || !isNotesVisible(state)) return undefined;
  return {
    label: applyTokens(notesContent(state).faqLinkTemplate, { title: note.title }),
    href: notePath(note.slug),
    slug: note.slug,
  };
}

export function readingMinutes(wordCount: number | undefined): number {
  return Math.max(1, Math.round((wordCount ?? 0) / WORDS_PER_MINUTE));
}

export function isParagraph(block: NoteBodyBlock | undefined): block is PortableTextBlock {
  if (block?._type !== "block") return false;
  const { style, listItem } = block as PortableTextBlock;
  return (style ?? "normal") === "normal" && !listItem;
}

export function openingText(body: NoteBodyBlock[]): string {
  return isParagraph(body[0]) ? toPlainText(body[0]).trim() : "";
}

export function truncateAtWord(text: string, maxLength = DESCRIPTION_MAX_LENGTH): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

export function noteDescription(note: {
  searchDescription?: string;
  subtitle: string;
  body: NoteBodyBlock[];
}): string {
  return (
    nonBlank(note.searchDescription) ??
    nonBlank(truncateAtWord(openingText(note.body))) ??
    note.subtitle
  );
}

export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function noteLastModified(note: {
  publishedAt?: string;
  updatedAt?: string;
}): string | undefined {
  return note.updatedAt ?? note.publishedAt;
}
