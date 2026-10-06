export type Reading = {
  id: string;
  tag: string;
  name: string;
  subtitle: string;
  price: string;
  valueProposition: string;
  briefDescription: string;
  includes: string[];
  howItWorks: string[];
  requiresBirthChart: boolean;
  requiresAkashic: boolean;
  requiresQuestions: boolean;
  stripePaymentLink: string;
};

export type Testimonial = {
  id: number;
  quote: string;
  name: string;
  detail: string;
};

const HOW_IT_WORKS_AFTER_FORM = [
  "I begin your reading within the next two days and send you a short note when I do.",
  "Within seven days you receive a voice note and a PDF, sent to the email you gave me.",
];

export const READINGS: Reading[] = [
  {
    id: "soul-blueprint",
    tag: "Signature",
    name: "Soul Blueprint",
    subtitle: "Soul Blueprint Reading",
    price: "$129",
    valueProposition: "The most complete picture of your soul I can give you",
    briefDescription:
      "This is the reading for when you want the whole picture of who you are and what you’re here to do. You choose the three questions that matter most to you right now, and I answer each one through your Akashic Records, your birth chart and the Thoth tarot. It’s my longest and most detailed reading.",
    includes: [
      "Your birth chart, and how its big themes connect to your questions",
      "Your Akashic Records, read for three questions you choose",
      "A card for each question, mostly from the Thoth tarot",
      "Your soul’s purpose, past lives and ancestral patterns, where they come through",
      "Big transits, when they bear on what you’ve asked",
      "Something practical to take away from each question",
    ],
    howItWorks: [
      "You fill in the form below with your birth details, your full name, a recent photo and the three questions you most want answered, then pay.",
      ...HOW_IT_WORKS_AFTER_FORM,
    ],
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "",
  },
  {
    id: "birth-chart",
    tag: "Astrology",
    name: "Birth Chart",
    subtitle: "Birth Chart Reading",
    price: "$89",
    valueProposition: "Your birth chart already explains the things you've never been able to explain about yourself.",
    briefDescription:
      "Your birth chart is a map of the sky at the exact moment and place you were born, and it says a lot about why you are the way you are. I’ll take you through the big themes in plain language, then look at your transits, the planets moving through your chart right now, and what they’re asking of you. If you already know some astrology, tell me when you book and I’ll go deeper.",
    includes: [
      "Who you are at your core, what you need to feel safe, and how you love",
      "Your natural gifts and where they show up",
      "The lessons you keep running into and the wounds you’re here to heal",
      "The direction your soul is growing in",
      "The big transits happening for you now, and how they’re likely to feel",
    ],
    howItWorks: [
      "You fill in the form below with your date, time and place of birth, then pay.",
      ...HOW_IT_WORKS_AFTER_FORM,
    ],
    requiresBirthChart: true,
    requiresAkashic: false,
    requiresQuestions: false,
    stripePaymentLink: "",
  },
  {
    id: "akashic-record",
    tag: "Soul Records",
    name: "Akashic Record",
    subtitle: "Akashic Records Reading",
    price: "$89",
    valueProposition: "Direct answers from your soul's records",
    briefDescription:
      "The Akashic Records are often described as a library of everything your soul has experienced, in this life and in others. Bring the three questions you most want answered, about your purpose, your relationships, money or past lives. For each one, I’ll tell you what I saw in your records, what it means for you now, and what you can do with it.",
    includes: [
      "Three questions of your choosing, explored in depth",
      "A card for each question, mostly from the Thoth tarot",
      "Past life patterns, ancestral themes or soul contracts explored where relevant",
      "Guidance on what your soul is ready to move toward",
      "Something practical to take away from each question",
    ],
    howItWorks: [
      "You fill in the form below with your full name, a recent photo and the three questions you most want answered, then pay.",
      ...HOW_IT_WORKS_AFTER_FORM,
    ],
    requiresBirthChart: false,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 1,
    quote:
      "I've had many readings over the years but nothing has come close to this. Josephine saw things in my chart and records that I had never spoken out loud to anyone. I listened to my voice note three times and cried each time - in the best possible way.",
    name: "Amelia R.",
    detail: "Soul Blueprint Reading",
  },
  {
    id: 2,
    quote:
      "The Akashic reading answered the question I'd been circling for years. The accuracy was startling, and the warmth Josephine brought to it made everything feel safe. My PDF has been on my desk ever since.",
    name: "Charlotte M.",
    detail: "Akashic Record Reading",
  },
  {
    id: 3,
    quote:
      "I booked the birth chart reading not really knowing what to expect. What I got was a level of self-understanding I didn't know was possible. It reframed everything. I finally understand why I am the way I am.",
    name: "Isabelle K.",
    detail: "Birth Chart Reading",
  },
];

export function getReadingById(id: string): Reading | undefined {
  return READINGS.find((reading) => reading.id === id);
}

export function getRequiredDetails(
  reading: Pick<Reading, "requiresBirthChart" | "requiresAkashic" | "requiresQuestions">,
): string[] {
  const details = new Set<string>();

  if (reading.requiresBirthChart) {
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
