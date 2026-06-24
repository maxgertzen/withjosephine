import { describe, expect, it } from "vitest";

import { ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

import { deriveLetterViewProps, resolveLetterReading } from "./deriveLetterViewProps";

function sanityReading(overrides: Partial<SanityReading> = {}): SanityReading {
  return {
    _id: "reading-soul-blueprint",
    name: "The Soul Blueprint",
    slug: "soul-blueprint",
    tag: "Signature",
    subtitle: "Soul Blueprint Reading",
    price: 179,
    priceDisplay: "$179",
    valueProposition: "Most complete",
    briefDescription: "Signature",
    expandedDetails: [],
    includes: [],
    bookingSummary: "Most comprehensive",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "https://buy.stripe.com/test",
    ...overrides,
  };
}

function bookingForm(
  entry: SanityBookingForm["entryPageContent"] = {},
): SanityBookingForm {
  return {
    nonRefundableNotice: "Non-refundable.",
    sections: [],
    entryPageContent: entry,
  };
}

describe("resolveLetterReading", () => {
  it("uses the sanity slug when sanity reading is present", () => {
    expect(resolveLetterReading("ignored", sanityReading({ slug: "soul-blueprint" }))).toEqual({
      slug: "soul-blueprint",
    });
  });

  it("falls back to readingId when sanity is null but static lookup hits", () => {
    expect(resolveLetterReading("soul-blueprint", null)).toEqual({ slug: "soul-blueprint" });
  });

  it("returns null when both sanity and static lookup miss", () => {
    expect(resolveLetterReading("nonexistent-reading", null)).toBeNull();
  });
});

describe("deriveLetterViewProps", () => {
  it("returns null when reading cannot be resolved", () => {
    expect(
      deriveLetterViewProps({
        readingId: "nonexistent-reading",
        sanityReading: null,
        bookingForm: null,
      }),
    ).toBeNull();
  });

  it("hydrates letter content from Sanity when present", () => {
    const props = deriveLetterViewProps({
      readingId: "soul-blueprint",
      sanityReading: sanityReading(),
      bookingForm: bookingForm({
        letterOpener: "Hi.",
        letterBridge: "Quick.",
        letterClosing: "Bye.",
        dropCapCta: "Go →",
        dropCapCaption: "Five minutes.",
      }),
    });
    expect(props).toEqual({
      reading: { slug: "soul-blueprint" },
      letterContent: {
        letterOpener: "Hi.",
        letterBridge: "Quick.",
        letterClosing: "Bye.",
        dropCapCta: "Go →",
        dropCapCaption: "Five minutes.",
      },
    });
  });

  it("falls through to ENTRY_PAGE_DEFAULTS when Sanity fields are missing", () => {
    const props = deriveLetterViewProps({
      readingId: "soul-blueprint",
      sanityReading: sanityReading(),
      bookingForm: null,
    });
    expect(props?.letterContent).toEqual({
      letterOpener: ENTRY_PAGE_DEFAULTS.letterOpener,
      letterBridge: ENTRY_PAGE_DEFAULTS.letterBridge,
      letterClosing: ENTRY_PAGE_DEFAULTS.letterClosing,
      dropCapCta: ENTRY_PAGE_DEFAULTS.dropCapCta,
      dropCapCaption: ENTRY_PAGE_DEFAULTS.dropCapCaption,
    });
  });
});
