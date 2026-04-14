export type Reading = {
  id: string;
  tag: string;
  name: string;
  subtitle: string;
  price: string;
  valueProposition: string;
  briefDescription: string;
  expandedDetails: string[];
  includes: string[];
  bookingSummary: string;
  requiresBirthChart: boolean;
  requiresAkashic: boolean;
  requiresQuestions: boolean;
  stripePaymentLink: string;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  detail: string;
};

export const READINGS: Reading[] = [
  {
    id: "soul-blueprint",
    tag: "Signature",
    name: "The Soul Blueprint",
    subtitle: "Soul Blueprint Reading",
    price: "$179",
    valueProposition:
      "The most complete picture of your soul I can give you",
    briefDescription:
      "My signature offering combining your birth chart, Akashic Records and card pulls to reveal your purpose, past lives, and ancestral patterns.",
    expandedDetails: [
      "This is honestly something really unusual. It weaves together three powerful modalities to create the deepest, most complete understanding of who you are and why you're here.",
      "I'll send you a personalised question menu before your reading so you can choose what you most want to explore. Nothing is generic. Everything is specific to you.",
      "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
    ],
    bookingSummary:
      "My most comprehensive reading. Your birth chart, Akashic Records and card pulls woven together to create the deepest, most complete picture of your soul I can give you.",
    includes: [
      "In-depth birth chart analysis",
      "Akashic Record reading with card pulls",
      "Your purpose, past lives & ancestral patterns",
      "Personalised question menu sent in advance",
      "Detailed voice note recording",
      "Supporting PDF — entirely bespoke",
    ],
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "",
  },
  {
    id: "birth-chart",
    tag: "Astrology",
    name: "The Birth Chart Reading",
    subtitle: "Birth Chart Reading",
    price: "$99",
    valueProposition:
      "Understand yourself in a way that makes sense of your life",
    briefDescription:
      "A deep dive into your chart revealing your core themes, gifts, patterns and what the current stars are saying about where you are right now.",
    expandedDetails: [
      "Astrology at this level isn't about your sun sign. It's about the specific energies, timing and patterns that shape your experience.",
      "We'll look at your natal chart and the current transits affecting you, so you understand both who you are and what's unfolding for you now.",
      "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
    ],
    bookingSummary:
      "A deep dive into your chart. Your core themes, gifts, patterns — and what the current stars are saying about where you are right now.",
    includes: [
      "Full natal chart analysis",
      "Your gifts, wounds and soul patterns",
      "Current transits and what they mean for you",
      "Detailed voice note recording",
      "Supporting PDF — entirely bespoke",
    ],
    requiresBirthChart: true,
    requiresAkashic: false,
    requiresQuestions: false,
    stripePaymentLink: "",
  },
  {
    id: "akashic-record",
    tag: "Soul Records",
    name: "The Akashic Record Reading",
    subtitle: "Akashic Record Reading",
    price: "$79",
    valueProposition:
      "Direct answers from your soul's infinite records",
    briefDescription:
      "You choose three questions, I open your records, tune in and pull a card for each. The most direct way to access what your soul already knows.",
    expandedDetails: [
      "The Akashic Records hold everything your soul has experienced across time. Sometimes the clearest guidance comes from simply asking the right question.",
      "I'll send you a question menu so you can choose what feels most relevant to you right now. Three questions, three clear answers.",
      "Delivered as a detailed voice note and a supporting PDF within 7 days of payment.",
    ],
    bookingSummary:
      "You choose three questions, I open your records and pull a card for each. The most direct way to access what your soul already knows.",
    includes: [
      "Three questions explored in depth",
      "Akashic Record reading with card pulls",
      "Personalised question menu sent in advance",
      "Detailed voice note recording",
      "Supporting PDF — entirely bespoke",
    ],
    requiresBirthChart: false,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    quote:
      "I've had many readings over the years but nothing has come close to this. Josephine saw things in my chart and records that I had never spoken out loud to anyone. I listened to my voice note three times and cried each time — in the best possible way.",
    name: "Amelia R.",
    detail: "Soul Blueprint Reading",
  },
  {
    id: "2",
    quote:
      "The Akashic reading answered the question I'd been circling for years. The accuracy was startling, and the warmth Josephine brought to it made everything feel safe. My PDF has been on my desk ever since.",
    name: "Charlotte M.",
    detail: "Akashic Record Reading",
  },
  {
    id: "3",
    quote:
      "I booked the birth chart reading not really knowing what to expect. What I got was a level of self-understanding I didn't know was possible. It reframed everything. I finally understand why I am the way I am.",
    name: "Isabelle K.",
    detail: "Birth Chart Reading",
  },
];

export function getReadingById(id: string): Reading | undefined {
  return READINGS.find((reading) => reading.id === id);
}

export function getRequiredDetails(reading: Pick<Reading, "requiresBirthChart" | "requiresAkashic" | "requiresQuestions">): string[] {
  const details = new Set<string>();

  if (reading.requiresBirthChart) {
    details.add("Full legal name");
    details.add("Date of birth");
    details.add("Time of birth (as exact as possible)");
    details.add("Place of birth");
  }

  if (reading.requiresAkashic) {
    details.add("Full legal name");
    details.add("A recent photo with your eyes open");
  }

  if (reading.requiresQuestions) {
    details.add("Your three chosen questions");
  }

  return [...details];
}
