import type { NoteBodyBlock, NotePlateValue } from "@/lib/notes/types";
import type { SanityArticle, SanityArticleSummary, SanityNotesState } from "@/lib/sanity/types";

function span(text: string, marks: string[] = []) {
  return { _type: "span", _key: text.slice(0, 6), text, marks };
}

export const PILLAR_PLATE: NotePlateValue = {
  _type: "notePlate",
  _key: "plate",
  label: "Read together",
  layout: "stacked",
  leftHeading: "What the chart shows",
  leftLines: ["Your gifts", "Your patterns", "Your purpose and your path"],
  rightHeading: "What the Records show",
  rightLines: [
    "Every experience",
    "Every contract",
    "Every lesson you've carried into this lifetime",
  ],
};

export const PILLAR_BODY: NoteBodyBlock[] = [
  {
    _type: "block",
    _key: "opening",
    style: "normal",
    markDefs: [],
    children: [
      span(
        "Your birth chart gives us the map of your soul in this lifetime. The Akashic Records give us the deeper story underneath it.",
      ),
    ],
  },
  {
    _type: "block",
    _key: "h2",
    style: "h2",
    markDefs: [],
    children: [span("Why I read them together")],
  },
  {
    _type: "block",
    _key: "p2",
    style: "normal",
    markDefs: [],
    children: [
      span(
        "Together they show you something about yourself that tends to land before you can fully put it into words.",
      ),
    ],
  },
  PILLAR_PLATE,
  {
    _type: "block",
    _key: "p3",
    style: "normal",
    markDefs: [
      { _type: "link", _key: "book", href: "/book/soul-blueprint" },
      { _type: "noteLink", _key: "next", slug: "what-to-ask" },
    ],
    children: [
      span("My "),
      span("signature reading", ["book"]),
      span(" reads them together. Next, read "),
      span("what to ask in an Akashic Records reading", ["next"]),
      span("."),
    ],
  },
  {
    _type: "block",
    _key: "quote",
    style: "blockquote",
    markDefs: [],
    children: [span("The answers are already there. I bring them back to you.")],
  },
];

export const PILLAR_ARTICLE: SanityArticle = {
  _id: "article-pillar",
  title: "How astrology and the Akashic Records work together",
  slug: "astrology-and-the-akashic-records",
  subtitle: "Your patterns, your purpose, what keeps repeating and why.",
  publishedAt: "2026-10-01T09:00:00Z",
  body: PILLAR_BODY,
  relatedReading: {
    name: "Soul Blueprint",
    slug: "soul-blueprint",
    priceDisplay: "$129",
    valueProposition: "The most complete picture of your soul I can give you",
  },
  moreNotes: [
    { title: "What to ask in an Akashic Records reading", slug: "what-to-ask" },
    { title: "Reading your birth chart without your birth time", slug: "birth-time" },
  ],
};

export const NOTE_SUMMARIES: SanityArticleSummary[] = [
  {
    _id: PILLAR_ARTICLE._id,
    title: PILLAR_ARTICLE.title,
    slug: PILLAR_ARTICLE.slug,
    subtitle: PILLAR_ARTICLE.subtitle,
    publishedAt: PILLAR_ARTICLE.publishedAt,
    wordCount: 1200,
  },
  {
    _id: "article-ask",
    title: "What to ask in an Akashic Records reading",
    slug: "what-to-ask",
    subtitle: "Three questions, how to choose them, and what the Records won't answer.",
    publishedAt: "2026-09-20T09:00:00Z",
    wordCount: 1000,
  },
  {
    _id: "article-birth-time",
    title: "Reading your birth chart without your birth time",
    subtitle: "You can still have a reading. Here is what changes.",
    slug: "birth-time",
    publishedAt: "2026-09-10T09:00:00Z",
    wordCount: 800,
  },
];

export const VISIBLE_NOTES_STATE: SanityNotesState = {
  settings: { enabled: true },
  publishedCount: NOTE_SUMMARIES.length,
};
