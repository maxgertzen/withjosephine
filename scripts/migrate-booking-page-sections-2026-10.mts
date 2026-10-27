import { READING_PAGE_DEFAULTS } from "../src/data/defaults";
import { linesWithText } from "../src/lib/content/nonBlank";
import { pickDefined } from "../src/lib/sanity/pickDefined";
import { loadDotenv } from "./_lib/loadDotenv.mts";
import { isMainModule } from "./_lib/main.mts";
import { rawPerspectiveClient } from "./_lib/sanity-write-client.mts";

const OLD_ORDER = [
  "summary",
  "facts",
  "reader",
  "included",
  "howItWorks",
  "giftRow",
  "questions",
  "intro",
  "testimonial",
  "form",
  "otherReadings",
  "notes",
] as const;

type OldPart = (typeof OLD_ORDER)[number];

const PART_SECTION: Record<"summary" | "reader" | "giftRow" | "otherReadings" | "notes", string> = {
  summary: "summarySection",
  reader: "readerSection",
  giftRow: "giftRowSection",
  otherReadings: "otherReadingsSection",
  notes: "notesSection",
};

type Reference = { _ref: string; _key?: string };

export type SharedSettings = {
  pageLayout?: { element?: string | null }[] | null;
  hiddenParts?: string[] | null;
  testimonialInsideForm?: boolean | null;
  readingPageContent?: { includedTitle?: string | null; howItWorksTitle?: string | null; questionsTitle?: string | null } | null;
};

export type ReadingRow = {
  _id: string;
  includes?: unknown[] | null;
  bookingIncludes?: unknown[] | null;
  howItWorks?: unknown[] | null;
  questionsOnPage?: Reference[] | null;
  formTestimonial?: Reference | null;
  facts?: unknown[] | null;
  intakeIntro?: unknown[] | null;
  pageLayout?: { element?: string | null }[] | null;
  hiddenParts?: string[] | null;
  bookingPage?: unknown[] | null;
};

type Section = Record<string, unknown> & { _key: string; _type: string };

const isOldPart = (value: unknown): value is OldPart => OLD_ORDER.includes(value as OldPart);

export function oldOrder(entries: { element?: string | null }[] | null | undefined): OldPart[] {
  const order: OldPart[] = [];
  for (const { element } of entries ?? []) {
    if (isOldPart(element) && !order.includes(element)) order.push(element);
  }
  OLD_ORDER.forEach((part, defaultIndex) => {
    if (order.includes(part)) return;
    const previous = OLD_ORDER.slice(0, defaultIndex).reverse().find((candidate) => order.includes(candidate));
    order.splice(previous ? order.indexOf(previous) + 1 : 0, 0, part);
  });
  return order;
}

const reference = (ref: Reference, key?: string) => ({ _type: "reference", _ref: ref._ref, ...(key ? { _key: key } : {}) });

export function buildSections(shared: SharedSettings, reading: ReadingRow | null): Section[] {
  const hidden = new Set([...(shared.hiddenParts ?? []), ...(reading?.hiddenParts ?? [])]);
  const titles = { ...READING_PAGE_DEFAULTS, ...pickDefined(shared.readingPageContent ?? {}) };
  const order = oldOrder(reading?.pageLayout?.length ? reading.pageLayout : shared.pageLayout);
  const bookingLines = linesWithText(reading?.bookingIncludes);

  return order.map((part): Section => {
    const shown = !hidden.has(part);
    switch (part) {
      case "included":
        return {
          _key: part,
          _type: "listSection",
          shown,
          title: titles.includedTitle,
          items: bookingLines.length > 0 ? bookingLines : linesWithText(reading?.includes),
        };
      case "howItWorks":
        return {
          _key: part,
          _type: "listSection",
          shown,
          title: titles.howItWorksTitle,
          items: linesWithText(reading?.howItWorks),
        };
      case "questions":
        return {
          _key: part,
          _type: "questionsSection",
          shown,
          title: titles.questionsTitle,
          questions: (reading?.questionsOnPage ?? [])
            .filter((question) => question?._ref)
            .map((question, index) => reference(question, question._key ?? `q${index}`)),
        };
      case "testimonial":
        return {
          _key: part,
          _type: "testimonialSection",
          shown,
          insideForm: shared.testimonialInsideForm !== false,
          ...(reading?.formTestimonial?._ref ? { testimonial: reference(reading.formTestimonial) } : {}),
        };
      case "form":
        return { _key: part, _type: "formSection" };
      case "facts":
        return { _key: part, _type: "factsSection", shown, ...(reading?.facts?.length ? { facts: reading.facts } : {}) };
      case "intro":
        return {
          _key: part,
          _type: "introSection",
          shown,
          ...(reading?.intakeIntro?.length ? { openingWords: reading.intakeIntro } : {}),
        };
      default:
        return { _key: part, _type: PART_SECTION[part], shown };
    }
  });
}

const SHARED_QUERY = `*[_type == "bookingForm" && !(_id in path("versions.**"))]{ _id, pageLayout, hiddenParts, testimonialInsideForm, readingPageContent, bookingPageStart }`;
const READINGS_QUERY = `*[_type == "reading" && !(_id in path("versions.**"))]{ _id, includes, bookingIncludes, howItWorks, questionsOnPage, formTestimonial, facts, intakeIntro, pageLayout, hiddenParts, bookingPage }`;

type SharedRow = SharedSettings & { _id: string; bookingPageStart?: unknown[] | null };

async function run(opts: { dataset: string; apply: boolean }): Promise<void> {
  const client = rawPerspectiveClient(opts.dataset, opts.apply);
  const [forms, readings] = await Promise.all([
    client.fetch<SharedRow[]>(SHARED_QUERY),
    client.fetch<ReadingRow[]>(READINGS_QUERY),
  ]);
  const published = forms.find(({ _id }) => _id === "bookingForm") ?? forms[0] ?? {};

  const transaction = client.transaction();
  let changes = 0;
  const describe = (sections: Section[]) =>
    sections.map((section) => `${section._type}${section.shown === false ? " (hidden)" : ""}`).join(", ");

  for (const form of forms.filter((row) => !row.bookingPageStart?.length)) {
    const sections = buildSections(form, null);
    console.log(`[${opts.dataset}] ${opts.apply ? "setting" : "would set"} ${form._id}.bookingPageStart: ${describe(sections)}`);
    transaction.patch(form._id, { set: { bookingPageStart: sections } });
    changes += 1;
  }
  for (const reading of readings.filter((row) => !row.bookingPage?.length)) {
    const sections = buildSections(published, reading);
    console.log(`[${opts.dataset}] ${opts.apply ? "setting" : "would set"} ${reading._id}.bookingPage: ${describe(sections)}`);
    transaction.patch(reading._id, { set: { bookingPage: sections } });
    changes += 1;
  }

  if (changes === 0) {
    console.log(`[${opts.dataset}] every reading and Booking Form already has its booking page list.`);
    return;
  }
  if (!opts.apply) return;
  await transaction.commit();
  console.log(`[${opts.dataset}] updated ${changes} documents.`);
}

async function main(): Promise<void> {
  loadDotenv();
  const [dataset, flag] = process.argv.slice(2);
  if (dataset !== "staging" && dataset !== "production") {
    console.error("Usage: pnpm tsx scripts/migrate-booking-page-sections-2026-10.mts staging|production [--apply]");
    process.exit(2);
  }
  await run({ dataset, apply: flag === "--apply" });
}

if (isMainModule(import.meta.url)) {
  await main();
}
