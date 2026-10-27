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
import { getReadingById } from "@/data/readings";
import { SANITY_READING_PRICES } from "@/data/readings.generated";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { pick } from "@/lib/pick";
import type {
  SanityBookingForm,
  SanityBookingPageSection,
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
    includes: [],
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    ...overrides,
  };
}

function part(type: string, extra: Partial<SanityBookingPageSection> = {}): SanityBookingPageSection {
  return { _key: type, _type: type, ...extra };
}

function listSection(key: string, title: string, items: string[]): SanityBookingPageSection {
  return { _key: key, _type: "listSection", title, items };
}

function testimonialSection(extra: Partial<SanityBookingPageSection> = {}): SanityBookingPageSection {
  return {
    _key: "quote",
    _type: "testimonialSection",
    testimonial: { _id: "t", quote: "It connected the dots.", name: "Raphi", detail: "Soul Blueprint Reading" },
    ...extra,
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
    nav: {},
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

  it("uses the opening words from the form heading row verbatim, marks and all", () => {
    const authored = paragraphBlocks(["Tell me what you already suspect."]);
    const reading = sanityReading({ bookingPage: [part("introSection", { openingWords: authored })] });

    expect(derive(reading)?.copy.intro).toBe(authored);
  });

  it("falls back to the per-slug paragraphs when the row has no opening words", () => {
    const emptyRow = sanityReading({ bookingPage: [part("introSection", { openingWords: [] })] });

    expect(introText(derive()?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
    expect(introText(derive(emptyRow)?.copy.intro)).toEqual(INTAKE_INTRO_BY_SLUG["soul-blueprint"]);
  });

  it("shows the row heading even when the shared heading is switched off", () => {
    const reading = sanityReading({ bookingPage: [part("introSection", { title: "Before we start" })] });

    expect(derive(reading)?.copy.title).toBe("Before we start");
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
  });

  it("takes Sanity's shared wording and keeps defaults for null fields", () => {
    const form = bookingForm({
      readingPageContent: {
        eyebrow: "Live reading",
        readerLine: null as unknown as string,
      },
    });
    const block = derive(sanityReading(), { bookingForm: form })?.readingBlock;

    expect(block?.eyebrow).toBe("Live reading");
    expect(block?.reader.line).toBe(READING_PAGE_DEFAULTS.readerLine);
  });

  it("hides the facts row when Becky removes every fact", () => {
    const form = bookingForm({ readingPageContent: { facts: [] } });

    expect(derive(sanityReading(), { bookingForm: form })?.readingBlock.facts).toEqual([]);
  });

  it("takes the promise and description from the booking page row, else the built-in words, never the homepage card", () => {
    const own = sanityReading({
      briefDescription: "Homepage description.",
      bookingPage: [part("summarySection", { promise: "Booking promise.", description: "\nBooking description.\n" })],
    });
    const blank = sanityReading({ briefDescription: "Homepage description.", bookingPage: [part("summarySection")] });
    const built = getReadingById("soul-blueprint")!;

    expect(derive(own)?.readingBlock).toMatchObject({ lead: "Booking promise.", description: "Booking description." });
    expect(derive(blank)?.readingBlock).toMatchObject({ lead: built.valueProposition, description: built.briefDescription });
    expect(derive(sanityReading({ slug: "tarot-spread" }))?.readingBlock).toMatchObject({ lead: "", description: "" });
  });

  it("keeps the built-in promise and description when Sanity has no reading", () => {
    const built = getReadingById("soul-blueprint")!;

    expect(derive(null)?.readingBlock).toMatchObject({ lead: built.valueProposition, description: built.briefDescription });
  });

  it("shows each box from the reading's Booking page list, in order", () => {
    const reading = sanityReading({
      bookingPage: [
        listSection("included", "What's included", ["One thing.", "Another thing."]),
        listSection("extra", "What to have ready", ["Your birth date."]),
      ],
    });

    expect(derive(reading)?.sections.aboveForm).toEqual([
      { key: "included", kind: "list", title: "What's included", items: ["One thing.", "Another thing."] },
      { key: "extra", kind: "list", title: "What to have ready", items: ["Your birth date."] },
    ]);
  });

  it("drops blank lines, including one carrying Presentation's invisible source-map marker", () => {
    const presentationMarker = "​‌‍﻿".repeat(10);
    const reading = sanityReading({
      bookingPage: [listSection("how", "How it works", ["How you book.", "  ", ` ${presentationMarker}`, "When it arrives."])],
    });

    expect(derive(reading)?.sections.aboveForm).toEqual([
      { key: "how", kind: "list", title: "How it works", items: ["How you book.", "When it arrives."] },
    ]);
  });

  it("skips paragraphs saved before the lines became a list", () => {
    const savedParagraph = paragraphBlocks(["How you book."])[0] as unknown as string;
    const reading = sanityReading({ bookingPage: [listSection("how", "How it works", [savedParagraph, "When it arrives."])] });

    expect(derive(reading)?.sections.aboveForm).toEqual([
      { key: "how", kind: "list", title: "How it works", items: ["When it arrives."] },
    ]);
  });

  it("shows no box for a list with no lines", () => {
    const reading = sanityReading({ bookingPage: [listSection("how", "How it works", ["", "   "])] });

    expect(derive(reading)?.sections.aboveForm).toEqual([]);
  });

  it("uses the built-in What's included and How it works when the reading is missing from Sanity", () => {
    const built = getReadingById("soul-blueprint")!;
    const lists = derive(null)?.sections.aboveForm.filter((section) => section.kind === "list");

    expect(lists?.map((section) => section.kind === "list" && section.items)).toEqual([built.includes, built.howItWorks]);
  });

  it("maps the picked questions in order and drops broken references", () => {
    const reading = sanityReading({
      bookingPage: [
        {
          _key: "faq",
          _type: "questionsSection",
          title: "Questions",
          questions: [
            { _id: "b", question: "Second?", answer: "Yes." },
            null,
            { _id: "a", question: "First?", answer: "No." },
          ],
        },
      ],
    });
    const [section] = derive(reading)?.sections.aboveForm ?? [];

    expect(section?.kind === "questions" && section.questions.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("shows no Questions box when none are picked", () => {
    const reading = sanityReading({ bookingPage: [{ _key: "faq", _type: "questionsSection", title: "Questions", questions: [] }] });

    expect(derive(reading)?.sections.aboveForm).toEqual([]);
  });

  it("lists the other readings from Sanity, excluding this one", () => {
    const readings = [
      sanityReading(),
      sanityReading({
        slug: "birth-chart",
        name: "Birth Chart Reading",
        priceDisplay: "$89",
        valueProposition: "Homepage promise.",
        bookingPromise: "Your chart.",
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
      "https://cdn.sanity.io/images/p/d/a.jpg?w=300&auto=format",
    );
    expect(derive()?.readingBlock.reader.imageUrl).toBe(ABOUT_DEFAULTS.imageUrl);
  });

  it("uses the shared facts unless the facts row has its own", () => {
    const own = [{ label: "Length", value: "1 hour" }];
    const shared = [{ label: "Format", value: "Voice" }];
    const withShared = (extra: Partial<SanityBookingForm["readingPageContent"]> = {}) =>
      bookingForm({ readingPageContent: { facts: shared, ...extra } });
    const facts = (readingOverrides: Partial<SanityReading>, form = withShared()) =>
      derive(sanityReading(readingOverrides), { bookingForm: form })?.readingBlock.facts;

    expect(facts({})).toEqual(shared);
    expect(facts({ bookingPage: [part("factsSection", { facts: own })] })).toEqual(own);
    expect(facts({ bookingPage: [part("factsSection", { facts: [] })] })).toEqual(shared);
    expect(facts({}, withShared({ facts: [] }))).toEqual([]);
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

  it("passes the reading's testimonial into the form with the shared label", () => {
    const reading = sanityReading({ bookingPage: [testimonialSection()] });
    const props = derive(reading);

    expect(props?.form.testimonial).toEqual({
      label: READING_PAGE_DEFAULTS.testimonialLabel,
      quote: "It connected the dots.",
      name: "Raphi",
      detail: "Soul Blueprint Reading",
    });
    expect(props?.sections.aboveForm).toEqual([]);
  });

  it("shows the testimonial on the page when its switch puts it outside the form", () => {
    const props = derive(sanityReading({ bookingPage: [testimonialSection({ insideForm: false })] }));

    expect(props?.form.testimonial).toBeUndefined();
    expect(props?.sections.aboveForm[0]).toMatchObject({ kind: "testimonial", testimonial: { quote: "It connected the dots." } });
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

describe("deriveBookingFormViewProps words held by the rows", () => {
  const form = bookingForm({
    readingPageContent: { eyebrow: "Shared label", readerName: "Shared name", otherReadingsTitle: "Shared others" },
  });
  const rowsReading = sanityReading({
    bookingPage: [
      part("summarySection", { eyebrow: "Own label", promise: "Own promise", description: " " }),
      part("readerSection", { name: "Becky", hidePhoto: true }),
      part("giftRowSection", { giftRowLabel: "Own gift row" }),
      part("otherReadingsSection"),
    ],
  });

  it("uses each row's own words and fills blank ones with the shared words", () => {
    const props = derive(rowsReading, { bookingForm: form });

    expect(props?.readingBlock).toMatchObject({
      eyebrow: "Own label",
      lead: "Own promise",
      description: getReadingById("soul-blueprint")!.briefDescription,
      reader: { name: "Becky", line: READING_PAGE_DEFAULTS.readerLine, imageUrl: undefined },
      otherReadings: { title: "Shared others" },
    });
    expect(props?.giftFold?.copy).toMatchObject({ giftRowLabel: "Own gift row", buyLead: GIFT_DEFAULTS.buyLead });
  });

  it("uses the row photo over the About photo", () => {
    const reading = sanityReading({
      bookingPage: [part("readerSection", { photoUrl: "https://cdn.sanity.io/images/p/d/own.jpg" })],
    });

    expect(derive(reading)?.readingBlock.reader.imageUrl).toBe("https://cdn.sanity.io/images/p/d/own.jpg?w=300&auto=format");
  });

  it("points a blank row word at its row in Presentation, and leaves filled ones to their own source map", () => {
    const targets = derive(rowsReading, { bookingForm: form, editable: true })?.readingBlock.editTargets;

    expect(targets?.eyebrow).toBeUndefined();
    expect(targets?.description).toContain("path=bookingPage:summarySection.description");
    expect(targets?.description).toContain("reading-soul-blueprint");
    expect(targets?.readerLine).toContain("path=bookingPage:readerSection.line");
    expect(targets?.otherReadingsTitle).toContain("path=bookingPage:otherReadingsSection.title");
  });

  it("leaves the shared words clickable to their own place when the reading uses the starting list", () => {
    const starting = bookingForm({
      readingPageContent: { eyebrow: "Shared label" },
      bookingPageStart: [part("summarySection")],
    });
    const props = derive(sanityReading(), { bookingForm: starting, editable: true });

    expect(props?.readingBlock.eyebrow).toBe("Shared label");
    expect(props?.readingBlock.editTargets?.eyebrow).toBeUndefined();
  });

  it("adds no click targets outside Presentation", () => {
    const targets = derive(rowsReading, { bookingForm: form })?.readingBlock.editTargets;

    expect(Object.values(targets ?? {}).filter(Boolean)).toEqual([]);
  });
});

describe("deriveBookingFormViewProps page order", () => {
  const types = (sections: { kind: string; key: string }[] | undefined) => sections?.map(({ key }) => key);

  it("uses the built-in list when Sanity has none", () => {
    expect(derive()?.sections.aboveForm[0]).toMatchObject({ kind: "part", part: "summarySection" });
  });

  it("uses the starting list from Booking Form until the reading has its own", () => {
    const form = bookingForm({ bookingPageStart: [part("formSection"), part("summarySection")] });
    expect(types(derive(sanityReading(), { bookingForm: form })?.sections.belowForm)).toEqual(["summarySection"]);

    const reading = sanityReading({ bookingPage: [part("summarySection"), part("formSection")] });
    expect(types(derive(reading, { bookingForm: form })?.sections.aboveForm)).toEqual(["summarySection"]);
  });

  it("leaves out the rows that are switched off", () => {
    const reading = sanityReading({ bookingPage: [part("factsSection", { shown: false }), part("readerSection")] });
    expect(types(derive(reading)?.sections.aboveForm)).toEqual(["readerSection"]);
  });

  it("passes the editable navigation words", () => {
    const form = bookingForm({ readingPageContent: { backLabel: "Go back", pageCounterTemplate: "{page}/{total}" } });
    const props = derive(sanityReading(), { bookingForm: form });
    expect(props?.backLabel).toBe("Go back");
    expect(props?.form.navigationLabels?.pageCounterTemplate).toBe("{page}/{total}");
    expect(props?.form.navigationLabels?.previousPageLabel).toBe(READING_PAGE_DEFAULTS.previousPageLabel);
  });
});

describe("deriveBookingFormViewProps for readings removed or switched off", () => {
  it("returns nothing for a slug Sanity no longer has, instead of the built-in copy", () => {
    expect(derive(null, { sanityReadings: [sanityReading()] })).toBeNull();
  });

  it("sends Back to the homepage top for a reading switched off on the site", () => {
    expect(derive(sanityReading({ onSite: false }))?.backHref).toBe("/");
  });
});
