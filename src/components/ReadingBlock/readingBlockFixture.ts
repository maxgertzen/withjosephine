import { ABOUT_DEFAULTS, READING_PAGE_DEFAULTS } from "@/data/defaults";
import { getReadingById } from "@/data/readings";

import type { ReadingBlockProps } from "./ReadingBlock";
import type { BookingSectionView } from "./sectionStackItem";

const SOUL_BLUEPRINT = getReadingById("soul-blueprint")!;

export const SOUL_BLUEPRINT_BLOCK: ReadingBlockProps = {
  slug: "soul-blueprint",
  eyebrow: READING_PAGE_DEFAULTS.eyebrow,
  lead: SOUL_BLUEPRINT.valueProposition,
  description: SOUL_BLUEPRINT.briefDescription,
  facts: READING_PAGE_DEFAULTS.facts,
  factsLayout: READING_PAGE_DEFAULTS,
  reader: {
    name: READING_PAGE_DEFAULTS.readerName,
    line: READING_PAGE_DEFAULTS.readerLine,
    imageUrl: ABOUT_DEFAULTS.imageUrl,
  },
  otherReadings: {
    title: READING_PAGE_DEFAULTS.otherReadingsTitle,
    readings: [
      {
        name: "Birth Chart Reading",
        price: "$89",
        line: "Your birth chart already explains the things you’ve never been able to explain about yourself.",
        slug: "birth-chart",
      },
      {
        name: "Akashic Records Reading",
        price: "$89",
        line: "Direct answers from your soul’s records",
        slug: "akashic-record",
      },
    ],
  },
};

export const SOUL_BLUEPRINT_QUESTIONS = [
  {
    id: "faq-birth-time",
    question: "What if I don’t know my exact birth time?",
    answer:
      "Get as close as you can. A rough time still produces a useful reading; I’ll tell you honestly what’s certain and what isn’t.",
  },
  {
    id: "faq-receive",
    question: "How will I receive my reading?",
    answer: "Every reading comes as a detailed voice note and a supporting PDF.",
  },
];

export const SOUL_BLUEPRINT_SECTIONS: BookingSectionView[] = [
  { key: "summary", kind: "part", part: "summarySection" },
  { key: "facts", kind: "part", part: "factsSection" },
  { key: "reader", kind: "part", part: "readerSection" },
  { key: "included", kind: "list", title: READING_PAGE_DEFAULTS.includedTitle, items: SOUL_BLUEPRINT.includes },
  { key: "how", kind: "list", title: READING_PAGE_DEFAULTS.howItWorksTitle, items: SOUL_BLUEPRINT.howItWorks },
  { key: "questions", kind: "questions", title: READING_PAGE_DEFAULTS.questionsTitle, questions: SOUL_BLUEPRINT_QUESTIONS },
  { key: "other", kind: "part", part: "otherReadingsSection" },
  { key: "notes", kind: "part", part: "notesSection" },
];
