import { describe, expect, it } from "vitest";

import { GIFT_SHEET_CONTENT_KEYS } from "@/components/GiftSheet/giftSheetCopy";
import {
  ABOUT_DEFAULTS,
  GIFT_DEFAULTS,
  INTAKE_INTRO_BY_SLUG,
  INTAKE_INTRO_FALLBACK,
  INTAKE_TITLE_FALLBACK,
  READING_PAGE_DEFAULTS,
} from "@/data/defaults";
import { SANITY_READING_PRICES } from "@/data/readings.generated";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { pick } from "@/lib/pick";
import type {
  SanityBookingForm,
  SanityLandingPage,
  SanityPortableTextBlock,
  SanityReading,
} from "@/lib/sanity/types";

import {
  deriveBookingFormViewProps,
  type DeriveBookingFormViewPropsInput,
} from "./deriveBookingFormViewProps";

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
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    ...overrides,
  };
}

function bookingForm(overrides: Partial<SanityBookingForm> = {}): SanityBookingForm {
  return { nonRefundableNotice: "Non-refundable.", sections: [], ...overrides };
}

function derive(
  reading: SanityReading | null = sanityReading(),
  extra: Partial<DeriveBookingFormViewPropsInput> = {},
) {
  return deriveBookingFormViewProps({
    readingId: "soul-blueprint",
    sanityReading: reading,
    sanityReadings: [],
    bookingPage: null,
    bookingForm: bookingForm(),
    landingPage: null,
    notesState: null,
    readingNotes: [],
    giftSettings: null,
    ...extra,
  });
}

function introText(blocks: SanityPortableTextBlock[] | undefined): string[] {
  return (blocks ?? []).map((block) =>
    ((block.children ?? []) as { text?: string }[]).map((span) => span.text ?? "").join(""),
  );
}

describe("deriveBookingFormViewProps intake copy", () => {
  it("leaves the form heading out unless Sanity switches it on", () => {
    const props = derive(sanityReading(), {
      bookingForm: bookingForm({
        entryPageContent: { letterTitle: "Before you begin, a few things." },
      }),
    });

    expect(props?.copy.title).toBeUndefined();
    expect(derive()?.copy.title).toBeUndefined();
  });

  it("shows the Sanity letterTitle when the heading is switched on", () => {
    const props = derive(sanityReading(), {
      bookingForm: bookingForm({
        entryPageContent: { letterTitle: "Before you begin, a few things.", showLetterTitle: true },
      }),
    });

    expect(props?.copy.title).toBe("Before you begin, a few things.");
  });

  it("falls back to the built-in heading when switched on with no letterTitle", () => {
    const props = derive(sanityReading(), {
      bookingForm: bookingForm({ entryPageContent: { showLetterTitle: true } }),
    });

    expect(props?.copy.title).toBe(INTAKE_TITLE_FALLBACK);
  });

  it("uses the reading's intakeIntro verbatim, marks and all", () => {
    const authored = paragraphBlocks(["Tell me what you already suspect."]);

    expect(derive(sanityReading({ intakeIntro: authored }))?.copy.intro).toBe(authored);
  });

  it("falls back to the per-slug paragraphs when intakeIntro is absent or empty", () => {
    expect(introText(derive()?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
    expect(introText(derive(sanityReading({ intakeIntro: [] }))?.copy.intro)).toEqual(
      INTAKE_INTRO_BY_SLUG["soul-blueprint"],
    );
  });

  it("falls back to the generic paragraphs for a slug with no built-in copy", () => {
    expect(introText(derive(sanityReading({ slug: "tarot-spread" }))?.copy.intro)).toEqual(
      INTAKE_INTRO_FALLBACK,
    );
  });

  it("keeps the built-in copy when Sanity has no reading at all", () => {
    const props = derive(null);

    expect(props?.copy.title).toBeUndefined();
    expect(introText(props?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
  });
});

describe("deriveBookingFormViewProps reading block", () => {
  it("uses the built-in wording when Sanity has no reading page content", () => {
    const block = derive()?.readingBlock;

    expect(block?.eyebrow).toBe(READING_PAGE_DEFAULTS.eyebrow);
    expect(block?.facts).toEqual(READING_PAGE_DEFAULTS.facts);
    expect(block?.reader.name).toBe(READING_PAGE_DEFAULTS.readerName);
    expect(block?.foldRowLabel).toBe("About the Soul Blueprint Reading");
  });

  it("takes Sanity's shared wording and keeps defaults for null fields", () => {
    const form = bookingForm({
      readingPageContent: {
        eyebrow: "Live reading",
        foldRowLabel: "Read about the {reading}",
        readerLine: null as unknown as string,
      },
    });
    const block = derive(sanityReading(), { bookingForm: form })?.readingBlock;

    expect(block?.eyebrow).toBe("Live reading");
    expect(block?.foldRowLabel).toBe("Read about the Soul Blueprint Reading");
    expect(block?.reader.line).toBe(READING_PAGE_DEFAULTS.readerLine);
  });

  it("hides the facts row when Becky removes every fact", () => {
    const form = bookingForm({ readingPageContent: { facts: [] } });

    expect(derive(sanityReading(), { bookingForm: form })?.readingBlock.facts).toEqual([]);
  });

  it("uses the first expanded detail as the body and the rest as How it works", () => {
    const block = derive(
      sanityReading({ expandedDetails: ["What it is.", "How you book.", "When it arrives."] }),
    )?.readingBlock;

    expect(block?.body).toBe("What it is.");
    expect(block?.howItWorks.paragraphs).toEqual(["How you book.", "When it arrives."]);
  });

  it("maps the picked questions in order and drops broken references", () => {
    const block = derive(
      sanityReading({
        questionsOnPage: [
          { _id: "b", question: "Second?", answer: "Yes." },
          null as unknown as { _id: string; question: string; answer: string },
          { _id: "a", question: "First?", answer: "No." },
        ],
      }),
    )?.readingBlock;

    expect(block?.questions.items.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("has no questions when none are picked", () => {
    expect(derive()?.readingBlock.questions.items).toEqual([]);
  });

  it("lists the other readings from Sanity, excluding this one", () => {
    const readings = [
      sanityReading(),
      sanityReading({
        slug: "birth-chart",
        name: "Birth Chart Reading",
        priceDisplay: "$89",
        valueProposition: "Your chart.",
      }),
    ];

    expect(
      derive(sanityReading(), { sanityReadings: readings })?.readingBlock.otherReadings.readings,
    ).toEqual([
      { name: "Birth Chart Reading", price: "$89", line: "Your chart.", slug: "birth-chart" },
    ]);
  });

  it("falls back to the built-in readings at the homepage's snapshot prices", () => {
    const others = derive()?.readingBlock.otherReadings.readings;

    expect(others?.map((reading) => reading.slug)).toEqual(["birth-chart", "akashic-record"]);
    expect(others?.[0].price).toBe(SANITY_READING_PRICES["birth-chart"]);
  });

  it("asks Sanity for a small portrait, and keeps the built-in photo as is", () => {
    const landingPage = {
      about: { imageUrl: "https://cdn.sanity.io/images/p/d/a.jpg" },
    } as SanityLandingPage;

    expect(derive(sanityReading(), { landingPage })?.readingBlock.reader.imageUrl).toBe(
      "https://cdn.sanity.io/images/p/d/a.jpg?w=112&auto=format",
    );
    expect(derive()?.readingBlock.reader.imageUrl).toBe(ABOUT_DEFAULTS.imageUrl);
  });

  it("uses the shared facts unless the reading has its own, and honours both hide switches", () => {
    const own = [{ label: "Length", value: "1 hour" }];
    const shared = [{ label: "Format", value: "Voice" }];
    const withShared = (extra: Partial<SanityBookingForm["readingPageContent"]> = {}) =>
      bookingForm({ readingPageContent: { facts: shared, ...extra } });
    const facts = (readingOverrides: Partial<SanityReading>, form = withShared()) =>
      derive(sanityReading(readingOverrides), { bookingForm: form })?.readingBlock.facts;

    expect(facts({})).toEqual(shared);
    expect(facts({ facts: own })).toEqual(own);
    expect(facts({ facts: own }, withShared({ hideFacts: true }))).toEqual(own);
    expect(facts({}, withShared({ hideFacts: true }))).toEqual([]);
    expect(facts({ facts: own, hideFacts: true })).toEqual([]);
    expect(derive()?.readingBlock.facts).toEqual(READING_PAGE_DEFAULTS.facts);
  });

  it("passes the facts layout from the Reading Page, with built-in fallbacks", () => {
    const form = bookingForm({
      readingPageContent: { factsPerRowPhone: 2, factsListOnPhones: true },
    });
    expect(derive(sanityReading(), { bookingForm: form })?.readingBlock.factsLayout).toMatchObject({
      factsPerRowPhone: 2,
      factsPerRowDesktop: READING_PAGE_DEFAULTS.factsPerRowDesktop,
      factsListOnPhones: true,
    });
  });

  it("leaves the reader photo out when the Reading Page hides it", () => {
    const hidden = bookingForm({ readingPageContent: { hideReaderPhoto: true } });
    const reader = derive(sanityReading(), { bookingForm: hidden })?.readingBlock.reader;
    expect(reader?.imageUrl).toBeUndefined();
    expect(reader?.name).toBe(READING_PAGE_DEFAULTS.readerName);
  });
});

describe("deriveBookingFormViewProps form extras", () => {
  it("puts the minutes before the Sanity tagline in the page line", () => {
    const form = bookingForm({ pageIndicatorTagline: "almost done" });

    expect(
      derive(sanityReading({ estimatedMinutes: 3 }), { bookingForm: form })?.form
        .pageIndicatorTagline,
    ).toBe("about 3 minutes · almost done");
    expect(derive(sanityReading({ estimatedMinutes: 3 }))?.form.pageIndicatorTagline).toBe(
      "about 3 minutes",
    );
    expect(derive()?.form.pageIndicatorTagline).toBeUndefined();
  });

  it("passes the reading's testimonial with the shared label", () => {
    const form = derive(
      sanityReading({
        formTestimonial: {
          _id: "t",
          quote: "It connected the dots.",
          name: "Raphi",
          detail: "Soul Blueprint Reading",
        },
      }),
    )?.form;

    expect(form?.testimonial).toEqual({
      label: READING_PAGE_DEFAULTS.testimonialLabel,
      quote: "It connected the dots.",
      name: "Raphi",
      detail: "Soul Blueprint Reading",
    });
  });

  it("passes no testimonial when none is set", () => {
    expect(derive()?.form.testimonial).toBeUndefined();
  });

  it("fills the reading name into the switched-reading notice from Sanity, or the default", () => {
    const form = bookingForm({ readingPageContent: { switchNoticeTemplate: "Now on {reading}." } });

    expect(derive(sanityReading(), { bookingForm: form })?.form.switchNotice).toBe(
      "Now on The Soul Blueprint.",
    );
    expect(derive()?.form.switchNotice).toMatch(/^Switched to The Soul Blueprint\./);
  });
});

describe("deriveBookingFormViewProps notes list", () => {
  const notes = [{ title: "Reading your chart without your birth time", slug: "birth-time" }];
  const visible = { settings: { enabled: true }, publishedCount: 1 };

  it("lists the reading's notes while Notes is visible", () => {
    expect(
      derive(sanityReading(), { notesState: visible, readingNotes: notes })?.readingBlock.notes,
    ).toEqual({
      title: "Notes on this reading",
      items: [{ ...notes[0], href: "/notes/birth-time" }],
    });
  });

  it("lists nothing while Notes is hidden or the reading has no notes", () => {
    const hidden = { settings: { enabled: false }, publishedCount: 1 };
    expect(
      derive(sanityReading(), { notesState: hidden, readingNotes: notes })?.readingBlock.notes,
    ).toBeUndefined();
    expect(derive(sanityReading(), { readingNotes: notes })?.readingBlock.notes).toBeUndefined();
    expect(derive(sanityReading(), { notesState: visible })?.readingBlock.notes).toBeUndefined();
  });
});

describe("deriveBookingFormViewProps gift row", () => {
  it("takes the gift row words from Gift Settings and fills blanks from the defaults", () => {
    const props = derive(sanityReading(), {
      giftSettings: { giftRowLabel: "A gift?", buyLinkLabel: "  ", redeemLead: "" },
    });

    expect(props?.giftFold?.copy).toEqual({
      giftRowLabel: "A gift?",
      buyLead: GIFT_DEFAULTS.buyLead,
      buyLinkLabel: GIFT_DEFAULTS.buyLinkLabel,
      redeemLead: GIFT_DEFAULTS.redeemLead,
      redeemLinkLabel: GIFT_DEFAULTS.redeemLinkLabel,
    });
  });

  it("uses the defaults when Gift Settings is missing", () => {
    expect(derive()?.giftFold?.copy.giftRowLabel).toBe(GIFT_DEFAULTS.giftRowLabel);
    expect(derive()?.giftFold?.giftSheet.content).toEqual(
      pick(GIFT_DEFAULTS, GIFT_SHEET_CONTENT_KEYS),
    );
  });

  it("gives the gift sheet the payment button text and the loading text of the booking form", () => {
    const props = derive(sanityReading(), {
      bookingPage: { paymentButtonText: "Pay now →" },
      bookingForm: bookingForm({ loadingStateCopy: "One moment." }),
    });

    expect(props?.giftFold?.giftSheet).toMatchObject({
      reading: { slug: "soul-blueprint", name: "The Soul Blueprint", price: "$179" },
      paymentButtonText: "Pay now →",
      loadingStateCopy: "One moment.",
      endpoint: "/api/gift/purchase",
    });
    expect(props?.giftFold?.redeemSheet).toMatchObject({
      readingSlug: "soul-blueprint",
      endpoint: "/api/gift/check",
    });
  });

  it("turns on the gift code field of the last page", () => {
    const props = derive(sanityReading(), { giftSettings: { codeFieldOptionalLabel: "Code?" } });

    expect(props?.form.giftCodeField?.copy.codeFieldOptionalLabel).toBe("Code?");
  });
});
