import { ABOUT_DEFAULTS, READING_PAGE_DEFAULTS } from "@/data/defaults";

import type { ReadingBlockProps } from "./ReadingBlock";

export const SOUL_BLUEPRINT_BLOCK: ReadingBlockProps = {
  slug: "soul-blueprint",
  foldRowLabel: "About the Soul Blueprint Reading",
  eyebrow: READING_PAGE_DEFAULTS.eyebrow,
  lead: "The most complete picture of your soul I can give you",
  body: "It brings together your purpose, your past lives, and the patterns you’ve carried down through your family line.",
  facts: READING_PAGE_DEFAULTS.facts,
  reader: {
    name: READING_PAGE_DEFAULTS.readerName,
    line: READING_PAGE_DEFAULTS.readerLine,
    imageUrl: ABOUT_DEFAULTS.imageUrl,
  },
  included: {
    title: READING_PAGE_DEFAULTS.includedTitle,
    items: [
      "Birth chart reading",
      "Akashic Record reading with a card pulls",
      "Your soul’s purpose in this lifetime",
      "Detailed voice note recording & supporting PDF",
    ],
  },
  howItWorks: {
    title: READING_PAGE_DEFAULTS.howItWorksTitle,
    paragraphs: [
      "You’ll complete a personalised question menu when booking, so the reading follows what you most want to understand.",
      "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
    ],
  },
  questions: {
    title: READING_PAGE_DEFAULTS.questionsTitle,
    items: [
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
    ],
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
