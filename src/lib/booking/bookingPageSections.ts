import { READING_PAGE_DEFAULTS, type ReadingFact } from "@/data/defaults";
import { linesWithText } from "@/lib/content/nonBlank";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

export const BOOKING_PAGE_PARTS = [
  { type: "summarySection", title: "Small label, promise and description" },
  { type: "factsSection", title: "Facts row" },
  { type: "readerSection", title: "Reader name and photo" },
  { type: "giftRowSection", title: "Gift row" },
  { type: "introSection", title: "Form heading and opening words" },
  { type: "formSection", title: "The form" },
  { type: "otherReadingsSection", title: "Not sure this is the one?" },
  { type: "notesSection", title: "Notes" },
] as const;

export type BookingPagePart = (typeof BOOKING_PAGE_PARTS)[number]["type"];

export const LIST_SECTION = "listSection";
export const QUESTIONS_SECTION = "questionsSection";
export const TESTIMONIAL_SECTION = "testimonialSection";
export const FORM_SECTION = "formSection";

type BookingPageRowWords = {
  title?: string | null;
  eyebrow?: string | null;
  promise?: string | null;
  description?: string | null;
  facts?: ReadingFact[] | null;
  name?: string | null;
  line?: string | null;
  photoUrl?: string | null;
  hidePhoto?: boolean | null;
  giftRowLabel?: string | null;
  buyLead?: string | null;
  buyLinkLabel?: string | null;
  redeemLead?: string | null;
  redeemLinkLabel?: string | null;
  openingWords?: SanityPortableTextBlock[] | null;
};

export type RowWordField = {
  [Field in keyof BookingPageRowWords]-?: NonNullable<BookingPageRowWords[Field]> extends string ? Field : never;
}[keyof BookingPageRowWords];

export type StoredSection<Question, Testimonial> = BookingPageRowWords & {
  _key?: string | null;
  _type?: string | null;
  shown?: boolean | null;
  items?: (string | null)[] | null;
  questions?: (Question | null)[] | null;
  testimonial?: Testimonial | null;
  insideForm?: boolean | null;
};

export type BookingPageSection<Question, Testimonial> =
  | { key: string; kind: "part"; part: BookingPagePart }
  | { key: string; kind: "list"; title: string; items: string[] }
  | { key: string; kind: "questions"; title: string; questions: Question[] }
  | { key: string; kind: "testimonial"; testimonial: Testimonial };

type ResolvedBookingPage<Question, Testimonial> = {
  aboveForm: BookingPageSection<Question, Testimonial>[];
  belowForm: BookingPageSection<Question, Testimonial>[];
  testimonialInsideForm: Testimonial | undefined;
};

const PART_TYPES = new Set<string>(BOOKING_PAGE_PARTS.map(({ type }) => type));
const ONE_PER_PAGE = new Set<string>([...PART_TYPES, TESTIMONIAL_SECTION]);

function isBookingPagePart(type: string | null | undefined): type is BookingPagePart {
  return PART_TYPES.has(type ?? "");
}

export function builtInBookingPage(lines: { included?: string[]; howItWorks?: string[] } = {}): StoredSection<never, never>[] {
  const part = (type: BookingPagePart) => ({ _type: type, shown: true });
  return [
    part("summarySection"),
    part("factsSection"),
    part("readerSection"),
    { _type: LIST_SECTION, shown: true, title: READING_PAGE_DEFAULTS.includedTitle, items: lines.included ?? [] },
    { _type: LIST_SECTION, shown: true, title: READING_PAGE_DEFAULTS.howItWorksTitle, items: lines.howItWorks ?? [] },
    part("giftRowSection"),
    { _type: QUESTIONS_SECTION, shown: true, title: READING_PAGE_DEFAULTS.questionsTitle, questions: [] },
    part("introSection"),
    { _type: TESTIMONIAL_SECTION, shown: true, insideForm: true },
    { _type: FORM_SECTION },
    part("otherReadingsSection"),
    part("notesSection"),
  ];
}

type BookingPageOwner = "reading" | "starting" | "builtIn";

export function chooseBookingPage<Question, Testimonial>(
  reading: StoredSection<Question, Testimonial>[] | null | undefined,
  starting: StoredSection<Question, Testimonial>[] | null | undefined,
): { rows: StoredSection<Question, Testimonial>[]; owner: BookingPageOwner } {
  if (reading?.length) return { rows: reading, owner: "reading" };
  if (starting?.length) return { rows: starting, owner: "starting" };
  return { rows: builtInBookingPage(), owner: "builtIn" };
}

export function partRows<Row extends { _type?: string | null }>(rows: readonly Row[]): Partial<Record<BookingPagePart, Row>> {
  const found: Partial<Record<BookingPagePart, Row>> = {};
  for (const row of rows) {
    if (isBookingPagePart(row._type) && !found[row._type]) found[row._type] = row;
  }
  return found;
}

function toSection<Question, Testimonial>(
  stored: StoredSection<Question, Testimonial>,
  key: string,
): BookingPageSection<Question, Testimonial> | null {
  if (stored._type === LIST_SECTION) {
    const items = linesWithText(stored.items);
    return items.length > 0 ? { key, kind: "list", title: stored.title ?? "", items } : null;
  }
  if (stored._type === QUESTIONS_SECTION) {
    const questions = (stored.questions ?? []).filter((question): question is Question => question != null);
    return questions.length > 0 ? { key, kind: "questions", title: stored.title ?? "", questions } : null;
  }
  if (stored._type === TESTIMONIAL_SECTION) {
    return stored.testimonial ? { key, kind: "testimonial", testimonial: stored.testimonial } : null;
  }
  return isBookingPagePart(stored._type) ? { key, kind: "part", part: stored._type } : null;
}

export function resolveBookingPage<Question, Testimonial>(
  stored: StoredSection<Question, Testimonial>[],
): ResolvedBookingPage<Question, Testimonial> {
  const seen = new Set<string>();
  const aboveForm: BookingPageSection<Question, Testimonial>[] = [];
  const belowForm: BookingPageSection<Question, Testimonial>[] = [];
  let formPlaced = false;
  let testimonialInsideForm: Testimonial | undefined;

  stored.forEach((entry, index) => {
    const type = entry._type ?? "";
    if (ONE_PER_PAGE.has(type) && seen.has(type)) return;
    seen.add(type);
    if (type === FORM_SECTION) {
      formPlaced = true;
      return;
    }
    if (entry.shown === false) return;
    if (type === TESTIMONIAL_SECTION && entry.insideForm !== false) {
      testimonialInsideForm = entry.testimonial ?? undefined;
      return;
    }
    const section = toSection(entry, entry._key ?? `section-${index}`);
    if (section) (formPlaced ? belowForm : aboveForm).push(section);
  });

  return { aboveForm, belowForm, testimonialInsideForm };
}
