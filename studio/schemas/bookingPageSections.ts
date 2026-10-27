import {
  BookIcon,
  CommentIcon,
  DocumentTextIcon,
  EditIcon,
  HelpCircleIcon,
  LinkIcon,
  ListIcon,
  PackageIcon,
  TagIcon,
  ThListIcon,
  UserIcon,
} from "@sanity/icons";
import { getPublishedId } from "@sanity/client/csm";
import type { ComponentType } from "react";
import {
  defineArrayMember,
  defineField,
  type FieldDefinition,
  type StringInputProps,
  type TextInputProps,
} from "sanity";

import { GIFT_FOLD_COPY_KEYS } from "../../src/components/GiftFold/giftFoldCopy";
import {
  GIFT_DEFAULTS,
  INTAKE_TITLE_FALLBACK,
  NOTES_DEFAULTS,
  READING_PAGE_DEFAULTS,
} from "../../src/data/defaults";
import {
  BOOKING_PAGE_PARTS,
  type BookingPagePart,
  builtInBookingPage,
  FORM_SECTION,
  LIST_SECTION,
  QUESTIONS_SECTION,
  TESTIMONIAL_SECTION,
} from "../../src/lib/booking/bookingPageSections";
import { BookingPageSectionRow } from "../components/BookingPageSectionRow";
import { sharedWordsInput } from "../components/SharedWordsInput";
import { PERSPECTIVE_API_VERSION } from "../lib/draftsClient";
import { randomKey } from "../lib/randomKey";
import { readingFactsField } from "./readingFacts";

const PART_HELP: Record<BookingPagePart, string> = {
  summarySection: "The small label, the promise and the description at the top of the page.",
  factsSection: "The short facts, like Format and Length.",
  readerSection: "Josephine's name, her one line, and her round photo.",
  giftRowSection: "The 'Giving or redeeming a gift' box and its two links.",
  introSection: "The heading and the opening words just above the form.",
  formSection: "The form people fill in to book. It is always on the page.",
  otherReadingsSection: "Links to the other readings.",
  notesSection:
    "Links to your Notes about this reading. It only shows when a note is linked to this reading.",
};

const PART_ICONS: Record<BookingPagePart, typeof TagIcon> = {
  summarySection: TagIcon,
  factsSection: ThListIcon,
  readerSection: UserIcon,
  giftRowSection: PackageIcon,
  introSection: DocumentTextIcon,
  formSection: EditIcon,
  otherReadingsSection: LinkIcon,
  notesSection: BookIcon,
};

const HIDDEN = "Hidden";

const SAME_ON_EVERY_READING =
  "Leave it empty to use the grey words, which every reading shares. Type here to use different words on this reading only.";

const PARAGRAPHS_AND_BULLETS = defineArrayMember({
  type: "block",
  styles: [{ title: "Paragraph", value: "normal" }],
  lists: [{ title: "Bullet", value: "bullet" }],
  marks: {
    decorators: [
      { title: "Bold", value: "strong" },
      { title: "Italic", value: "em" },
    ],
    annotations: [],
  },
});

function sharedQuery(documentType: string, path: string) {
  return `coalesce(*[_type == "${documentType}"][0].${path}, $fallback)`;
}

function wordsField(
  name: string,
  title: string,
  input: ComponentType<StringInputProps | TextInputProps>,
  options: { description?: string; rows?: number } = {},
) {
  return defineField({
    name,
    title,
    type: options.rows ? "text" : "string",
    ...(options.rows ? { rows: options.rows } : {}),
    description: options.description ?? SAME_ON_EVERY_READING,
    components: { input },
  });
}

const bookingFormWords = (path: string, fallback: string) =>
  sharedWordsInput(sharedQuery("bookingForm", `readingPageContent.${path}`), { fallback });

const giftWords = (key: (typeof GIFT_FOLD_COPY_KEYS)[number]) =>
  sharedWordsInput(sharedQuery("giftSettings", key), { fallback: GIFT_DEFAULTS[key] });

const GIFT_WORD_TITLES: Record<(typeof GIFT_FOLD_COPY_KEYS)[number], string> = {
  giftRowLabel: "Words on the gift row",
  buyLead: "Small line above the 'buy a gift' link",
  buyLinkLabel: "Words on the 'buy a gift' link",
  redeemLead: "Small line above the 'use a gift code' link",
  redeemLinkLabel: "Words on the 'use a gift code' link",
};

const PART_WORDS: Record<BookingPagePart, FieldDefinition[]> = {
  summarySection: [
    wordsField(
      "eyebrow",
      "Small label",
      bookingFormWords("eyebrow", READING_PAGE_DEFAULTS.eyebrow),
    ),
    defineField({
      name: "promise",
      title: "Promise",
      type: "string",
      description:
        "One line at the top of this reading's booking page, under the small label. It also shows under this reading's name in 'Not sure this is the one?' on the other booking pages. The homepage card has its own promise.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      description:
        "A few sentences under the promise on this reading's booking page. Press Enter to start a new line. The homepage card has its own description.",
      validation: (rule) => rule.required(),
    }),
  ],
  factsSection: [
    readingFactsField({
      description: "The short facts on this reading's booking page, like Format and Length.",
      inherits: "bookingForm",
    }),
  ],
  readerSection: [
    wordsField("name", "Name", bookingFormWords("readerName", READING_PAGE_DEFAULTS.readerName)),
    wordsField(
      "line",
      "Line under the name",
      bookingFormWords("readerLine", READING_PAGE_DEFAULTS.readerLine),
    ),
    defineField({
      name: "photo",
      title: "Photo",
      type: "image",
      description: "Leave it empty to use the photo from the About part of the homepage.",
    }),
    defineField({
      name: "hidePhoto",
      title: "Hide the photo",
      type: "boolean",
      description: "On: no round photo next to the name.",
    }),
  ],
  giftRowSection: GIFT_FOLD_COPY_KEYS.map((key) =>
    wordsField(key, GIFT_WORD_TITLES[key], giftWords(key)),
  ),
  introSection: [
    wordsField(
      "title",
      "Heading",
      sharedWordsInput(
        `select(*[_type == "bookingForm"][0].entryPageContent.showLetterTitle == true => coalesce(*[_type == "bookingForm"][0].entryPageContent.letterTitle, $fallback))`,
        { fallback: INTAKE_TITLE_FALLBACK },
      ),
      {
        description:
          "The heading above the opening words. If there are no grey words, leave it empty for no heading. Type here to give this reading a heading.",
      },
    ),
    defineField({
      name: "openingWords",
      title: "Opening words",
      type: "array",
      of: [PARAGRAPHS_AND_BULLETS],
      description:
        "The words just above the form. You can write several paragraphs and use bold, italic and bullet points. Bullet points show with a small tick. Leave it empty to use the site's own opening words.",
    }),
  ],
  formSection: [],
  otherReadingsSection: [
    wordsField(
      "title",
      "Heading",
      bookingFormWords("otherReadingsTitle", READING_PAGE_DEFAULTS.otherReadingsTitle),
    ),
  ],
  notesSection: [
    wordsField(
      "title",
      "Heading",
      sharedWordsInput(sharedQuery("notesSettings", "readingPageTitle"), {
        fallback: NOTES_DEFAULTS.readingPageTitle,
      }),
    ),
  ],
};

function shownField(description: string) {
  return defineField({
    name: "shown",
    title: "Show on the page",
    type: "boolean",
    initialValue: true,
    description,
  });
}

const partMembers = (withWords: boolean) =>
  BOOKING_PAGE_PARTS.map(({ type, title }) =>
    defineArrayMember({
      type: "object",
      name: type,
      title,
      icon: PART_ICONS[type],
      components: { item: BookingPageSectionRow },
      fields: [
        type === FORM_SECTION
          ? defineField({
              name: "shown",
              type: "boolean",
              hidden: true,
              readOnly: true,
              description: PART_HELP[type],
            })
          : shownField(PART_HELP[type]),
        ...(withWords ? PART_WORDS[type] : []),
      ],
      preview: {
        select: { shown: "shown" },
        prepare: ({ shown }) => ({
          title,
          subtitle:
            type === FORM_SECTION ? "Always on the page" : shown === false ? HIDDEN : undefined,
        }),
      },
    }),
  );

const headingField = defineField({
  name: "title",
  title: "Heading",
  type: "string",
  description: "The words on the box. People tap the box to open it.",
  validation: (rule) => rule.required(),
});

function countLine(count: number, one: string, many: string, shown: boolean | undefined) {
  const amount = count === 1 ? `1 ${one}` : `${count} ${many}`;
  return shown === false ? `${amount} · ${HIDDEN}` : amount;
}

const listMember = defineArrayMember({
  type: "object",
  name: LIST_SECTION,
  title: "Box that opens with a list",
  icon: ListIcon,
  components: { item: BookingPageSectionRow },
  fields: [
    headingField,
    defineField({
      name: "items",
      title: "Lines",
      type: "array",
      of: [{ type: "string" }],
      description:
        "One line per item. Each line gets a small tick. If there are no lines, the box does not show.",
    }),
    shownField("Switch off to hide this box without losing what you wrote."),
  ],
  preview: {
    select: { title: "title", items: "items", shown: "shown" },
    prepare: ({ title, items, shown }) => ({
      title: title || "Box with a list",
      subtitle: countLine(items?.length ?? 0, "line", "lines", shown),
    }),
  },
});

const questionsMember = defineArrayMember({
  type: "object",
  name: QUESTIONS_SECTION,
  title: "Box that opens with questions",
  icon: HelpCircleIcon,
  components: { item: BookingPageSectionRow },
  fields: [
    headingField,
    defineField({
      name: "questions",
      title: "Questions",
      type: "array",
      of: [{ type: "reference", to: [{ type: "faqItem" }] }],
      description:
        "Pick questions from your FAQ list, or make a new one. Drag them to change their order. If there are no questions, the box does not show.",
    }),
    shownField("Switch off to hide this box without losing your questions."),
  ],
  preview: {
    select: { title: "title", questions: "questions", shown: "shown" },
    prepare: ({ title, questions, shown }) => ({
      title: title || "Box with questions",
      subtitle: countLine(questions?.length ?? 0, "question", "questions", shown),
    }),
  },
});

const quoteField = defineField({
  name: "testimonial",
  title: "Quote",
  type: "reference",
  to: [{ type: "testimonial" }],
  options: {
    filter: ({ document }) =>
      document._type === "reading"
        ? {
            filter: "readingType._ref == $readingId",
            params: { readingId: getPublishedId(document._id) },
          }
        : {},
  },
  description:
    "Pick a quote someone wrote about this reading. Only quotes for this reading are listed.",
});

const testimonialMember = (withQuote: boolean) =>
  defineArrayMember({
    type: "object",
    name: TESTIMONIAL_SECTION,
    title: "Testimonial",
    icon: CommentIcon,
    components: { item: BookingPageSectionRow },
    fields: [
      ...(withQuote ? [quoteField] : []),
      defineField({
        name: "insideForm",
        title: "Show it inside the form, on the last page",
        type: "boolean",
        initialValue: true,
        description:
          "On: the quote sits on the last page of the form, just above the tick boxes. Off: the quote shows here, in this spot on the page.",
      }),
      shownField("Switch off to hide the quote everywhere."),
    ],
    preview: {
      select: { name: "testimonial.name", insideForm: "insideForm", shown: "shown" },
      prepare: ({ name, insideForm, shown }) => ({
        title: name ? `Testimonial from ${name}` : "Testimonial (no quote picked)",
        subtitle:
          shown === false
            ? HIDDEN
            : insideForm === false
              ? "Here on the page"
              : "Inside the form, on the last page",
      }),
    },
  });

const sectionMembers = (forOneReading: boolean) => [
  listMember,
  questionsMember,
  testimonialMember(forOneReading),
  ...partMembers(forOneReading),
];

const STARTING_LIST_QUERY = `*[_type == "bookingForm"][0].bookingPageStart`;

type StoredRow = Record<string, unknown> & { _type?: string | null };

const withNewKey = (row: StoredRow) => ({ ...row, _key: randomKey() });

function checkRows(rows: StoredRow[] | undefined) {
  if (!rows?.some((row) => row._type === FORM_SECTION)) {
    return "The form is missing from this list. Without it nobody can book. Use 'Add item' and pick 'The form'.";
  }
  const twice = BOOKING_PAGE_PARTS.find(
    ({ type }) => rows.filter((row) => row._type === type).length > 1,
  );
  return twice
    ? `'${twice.title}' is in this list twice. Only the first one shows on the page. Remove the other one.`
    : true;
}

export const readingBookingPageField = (group: string) =>
  defineField({
    name: "bookingPage",
    title: "Booking page",
    group,
    type: "array",
    of: sectionMembers(true),
    description:
      "Everything on this reading's booking page, from top to bottom. Drag a row to move it up or down. Use the switch on a row to show or hide it. Click a row to change its words. Use 'Add item' to add another box that opens and closes.",
    initialValue: async (_params, context) => {
      const starting = await context
        .getClient({ apiVersion: PERSPECTIVE_API_VERSION })
        .withConfig({ perspective: "published" })
        .fetch<StoredRow[] | null>(STARTING_LIST_QUERY);
      const rows: StoredRow[] = starting?.length ? starting : builtInBookingPage();
      return rows.map(withNewKey);
    },
    validation: (rule) => rule.custom<StoredRow[]>(checkRows),
  });

export const startingBookingPageField = defineField({
  name: "bookingPageStart",
  title: "Booking page for new readings",
  type: "array",
  of: sectionMembers(false),
  description:
    "A new reading starts with this list. Changing it does not change readings you already have. Each reading changes its words in its own Booking page list.",
  validation: (rule) => rule.custom<StoredRow[]>(checkRows),
});
