export const READING_SLUGS = ["soul-blueprint", "birth-chart", "akashic-record"] as const;

export type ReadingSlug = (typeof READING_SLUGS)[number];

export const READINGS_FOR_SMOKE = [
  { slug: "soul-blueprint" as const, expectedName: /Soul Blueprint/i },
  { slug: "birth-chart" as const, expectedName: /Birth Chart/i },
  { slug: "akashic-record" as const, expectedName: /Akashic/i },
];
