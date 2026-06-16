import { describe, expect, it } from "vitest";

import { BOOKING_INFO_DEFAULTS, ENTRY_PAGE_DEFAULTS } from "@/data/defaults";
import type {
  SanityBookingForm,
  SanityBookingPage,
  SanityReading,
} from "@/lib/sanity/types";

import { deriveBookingEntryProps, resolveReading } from "./deriveBookingEntryProps";

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
    includes: ["A voice note", "A PDF"],
    bookingSummary: "Most comprehensive reading",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "https://buy.stripe.com/test",
    ...overrides,
  };
}

function bookingPage(overrides: Partial<SanityBookingPage> = {}): SanityBookingPage {
  return {
    paymentButtonText: "Continue to payment →",
    formatNote: "Voice note + PDF.",
    deliveryNote: "Within 7 days.",
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

describe("resolveReading", () => {
  it("maps SanityReading fields onto BookingEntryReading shape", () => {
    const reading = resolveReading("soul-blueprint", sanityReading());
    expect(reading).toEqual({
      slug: "soul-blueprint",
      tag: "Signature",
      name: "The Soul Blueprint",
      priceLabel: "$179",
      shortDescription: "Most comprehensive reading",
      includedItems: ["A voice note", "A PDF"],
    });
  });

  it("falls back to static reading data when sanity returns null", () => {
    const reading = resolveReading("soul-blueprint", null);
    expect(reading).not.toBeNull();
    expect(reading?.slug).toBe("soul-blueprint");
    expect(reading?.name).toBe("Soul Blueprint");
  });

  it("returns null when both sanity and static lookup miss", () => {
    expect(resolveReading("nonexistent-reading", null)).toBeNull();
  });
});

describe("deriveBookingEntryProps", () => {
  it("returns null when reading cannot be resolved", () => {
    const props = deriveBookingEntryProps({
      readingId: "nonexistent-reading",
      sanityReading: null,
      bookingPage: null,
      bookingForm: null,
    });
    expect(props).toBeNull();
  });

  it("hydrates copy from Sanity when present", () => {
    const props = deriveBookingEntryProps({
      readingId: "soul-blueprint",
      sanityReading: sanityReading(),
      bookingPage: bookingPage({
        whatsIncludedHeading: "Inside this reading",
        bookReadingCtaText: "Begin",
      }),
      bookingForm: bookingForm({
        changeReadingLinkText: "Pick a different one",
        aboutJosephineLinkText: "Meet Josephine",
        giftToggleAsGiftLabel: "Give as a gift",
      }),
    });
    expect(props).toMatchObject({
      reading: { slug: "soul-blueprint" },
      aboutJosephineLinkText: "Meet Josephine",
      copy: {
        changeReadingLinkText: "Pick a different one",
        deliveryNote: "Within 7 days.",
        deliverableNote: "Voice note + PDF.",
        whatsIncludedHeading: "Inside this reading",
        bookReadingCtaText: "Begin",
        giftToggleAsGiftLabel: "Give as a gift",
      },
    });
  });

  it("falls through to ENTRY_PAGE_DEFAULTS / BOOKING_INFO_DEFAULTS when Sanity fields are missing", () => {
    const props = deriveBookingEntryProps({
      readingId: "soul-blueprint",
      sanityReading: sanityReading(),
      bookingPage: null,
      bookingForm: null,
    });
    expect(props?.aboutJosephineLinkText).toBe(ENTRY_PAGE_DEFAULTS.aboutJosephineLinkText);
    expect(props?.copy.changeReadingLinkText).toBe(ENTRY_PAGE_DEFAULTS.changeReadingLinkText);
    expect(props?.copy.giftToggleAsGiftLabel).toBe(ENTRY_PAGE_DEFAULTS.giftToggleAsGiftLabel);
    expect(props?.copy.deliveryNote).toBe(BOOKING_INFO_DEFAULTS.deliveryNote);
    expect(props?.copy.deliverableNote).toBe(BOOKING_INFO_DEFAULTS.deliverableNote);
    expect(props?.copy.whatsIncludedHeading).toBe(BOOKING_INFO_DEFAULTS.whatsIncludedHeading);
    expect(props?.copy.bookReadingCtaText).toBe(BOOKING_INFO_DEFAULTS.bookReadingCtaText);
  });

  it("uses static reading fallback when sanity reading is null but readingId is known", () => {
    const props = deriveBookingEntryProps({
      readingId: "soul-blueprint",
      sanityReading: null,
      bookingPage: null,
      bookingForm: null,
    });
    expect(props?.reading.slug).toBe("soul-blueprint");
  });
});
