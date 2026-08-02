import { describe, expect, it } from "vitest";

import { INTAKE_INTRO_BY_SLUG, INTAKE_INTRO_FALLBACK, INTAKE_TITLE_FALLBACK } from "@/data/defaults";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import type {
  SanityBookingForm,
  SanityEntryPageContent,
  SanityPortableTextBlock,
  SanityReading,
} from "@/lib/sanity/types";

import { deriveBookingFormViewProps } from "./deriveBookingFormViewProps";

function sanityReading(overrides: Partial<SanityReading> = {}): SanityReading {
  return {
    _id: "reading-soul-blueprint",
    name: "The Soul Blueprint",
    slug: "soul-blueprint",
    tag: "Signature",
    subtitle: "Soul Blueprint Reading",
    price: 179,
    priceDisplay: "$179",
    valueProposition: "The most complete picture",
    briefDescription: "My signature offering",
    expandedDetails: [],
    includes: [],
    bookingSummary: "Most comprehensive reading",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    ...overrides,
  };
}

function bookingForm(entryPageContent?: SanityEntryPageContent): SanityBookingForm {
  return { nonRefundableNotice: "Non-refundable.", sections: [], entryPageContent };
}

function derive(reading: SanityReading | null, entry?: SanityEntryPageContent) {
  return deriveBookingFormViewProps({
    readingId: "soul-blueprint",
    sanityReading: reading,
    bookingPage: null,
    bookingForm: bookingForm(entry),
  });
}

function introText(blocks: SanityPortableTextBlock[] | undefined): string[] {
  return (blocks ?? []).map((block) =>
    ((block.children ?? []) as { text?: string }[]).map((span) => span.text ?? "").join(""),
  );
}

describe("deriveBookingFormViewProps intake copy", () => {
  it("prefers the Sanity letterTitle over the built-in heading", () => {
    const props = derive(sanityReading(), { letterTitle: "Before you begin, a few things." });

    expect(props?.copy.title).toBe("Before you begin, a few things.");
  });

  it("falls back to the built-in heading when letterTitle is absent", () => {
    expect(derive(sanityReading())?.copy.title).toBe(INTAKE_TITLE_FALLBACK);
  });

  it("uses the reading's intakeIntro verbatim, marks and all", () => {
    const authored = paragraphBlocks(["Tell me what you already suspect."]);
    const props = derive(sanityReading({ intakeIntro: authored }));

    expect(props?.copy.intro).toBe(authored);
  });

  it("falls back to the per-slug paragraphs when intakeIntro is absent", () => {
    expect(introText(derive(sanityReading())?.copy.intro)).toEqual(
      INTAKE_INTRO_BY_SLUG["soul-blueprint"],
    );
  });

  it("falls back when intakeIntro exists but is an empty array", () => {
    const props = derive(sanityReading({ intakeIntro: [] }));

    expect(introText(props?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
  });

  it("falls back to the generic paragraphs for a slug with no built-in copy", () => {
    const props = deriveBookingFormViewProps({
      readingId: "soul-blueprint",
      sanityReading: sanityReading({ slug: "tarot-spread" }),
      bookingPage: null,
      bookingForm: bookingForm(),
    });

    expect(introText(props?.copy.intro)).toEqual(INTAKE_INTRO_FALLBACK);
  });

  it("keeps the built-in copy when Sanity has no reading at all", () => {
    const props = derive(null);

    expect(props?.copy.title).toBe(INTAKE_TITLE_FALLBACK);
    expect(introText(props?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
  });
});
