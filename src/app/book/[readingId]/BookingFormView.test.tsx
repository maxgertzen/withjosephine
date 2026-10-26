import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const intakeForm = vi.hoisted(() => vi.fn<(props: { testimonial?: unknown }) => null>(() => null));
vi.mock("@/components/IntakeForm", () => ({
  IntakeForm: intakeForm,
}));

import { GIFT_FOLD_COPY_KEYS } from "@/components/GiftFold/giftFoldCopy";
import { SOUL_BLUEPRINT_BLOCK } from "@/components/ReadingBlock/readingBlockFixture";
import { GIFT_DEFAULTS } from "@/data/defaults";
import {
  type BookingPageLayout,
  DEFAULT_BOOKING_PAGE_LAYOUT,
  defaultBookingPageLayoutEntries,
  resolveBookingPageLayout,
} from "@/lib/booking/pageLayout";
import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import { pick } from "@/lib/pick";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

import { BookingFormView, type BookingFormViewProps } from "./BookingFormView";

function props(
  intro: SanityPortableTextBlock[],
  layout: BookingPageLayout = DEFAULT_BOOKING_PAGE_LAYOUT,
): BookingFormViewProps {
  return {
    nav: {},
    backHref: "/#reading-birth-chart",
    reading: {
      slug: "birth-chart",
      tag: "Astrology",
      name: "Birth Chart Reading",
      priceLabel: "$89",
    },
    readingBlock: SOUL_BLUEPRINT_BLOCK,
    layout,
    copy: { title: "A few things, before we begin.", intro },
    form: {
      sections: [],
      nonRefundableNotice: "Non-refundable.",
      switchNotice: "Switched to Birth Chart Reading.",
    },
  };
}

const BOLD_INTRO: SanityPortableTextBlock[] = [
  {
    _type: "block",
    _key: "b0",
    style: "normal",
    markDefs: [],
    children: [
      { _type: "span", _key: "b0-0", text: "Take your ", marks: [] },
      { _type: "span", _key: "b0-1", text: "time", marks: ["strong"] },
      { _type: "span", _key: "b0-2", text: " with this.", marks: [] },
    ],
  },
];

describe("BookingFormView intake copy", () => {
  it("renders every intro paragraph", () => {
    render(
      <BookingFormView {...props(paragraphBlocks(["First paragraph.", "Second paragraph."]))} />,
    );

    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders bold marks authored in Sanity", () => {
    render(<BookingFormView {...props(BOLD_INTRO)} />);

    const bold = screen.getByText("time");
    expect(bold.tagName).toBe("STRONG");
  });

  it("makes the reading name the only h1 and the intake title an h2", () => {
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]))} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Birth Chart Reading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "A few things, before we begin." }),
    ).toBeInTheDocument();
  });

  it("renders no h2 heading when the intake title is left out", () => {
    const base = props(paragraphBlocks(["Only paragraph."]));
    render(<BookingFormView {...base} copy={{ ...base.copy, title: undefined }} />);

    expect(
      screen.queryByRole("heading", { level: 2, name: "A few things, before we begin." }),
    ).toBeNull();
    expect(screen.getByText("Only paragraph.")).toBeInTheDocument();
  });

  it("renders the reading block before the intake title", () => {
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]))} />);

    const lead = screen.getByText(SOUL_BLUEPRINT_BLOCK.lead);
    const title = screen.getByRole("heading", { level: 2, name: "A few things, before we begin." });
    expect(lead.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

const GIFT_FOLD: NonNullable<BookingFormViewProps["giftFold"]> = {
  readingSlug: "birth-chart",
  copy: pick(GIFT_DEFAULTS, GIFT_FOLD_COPY_KEYS),
  giftSheet: {
    reading: { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" },
    content: GIFT_DEFAULTS,
    endpoint: null,
  },
  redeemSheet: { readingSlug: "birth-chart", content: GIFT_DEFAULTS, endpoint: null },
};

describe("BookingFormView gift row", () => {
  it("sits after the reading block and before the intake title and intro", () => {
    render(
      <BookingFormView {...props(paragraphBlocks(["Only paragraph."]))} giftFold={GIFT_FOLD} />,
    );

    const lead = screen.getByText(SOUL_BLUEPRINT_BLOCK.lead);
    const giftRow = screen.getByTestId("gift-fold");
    const title = screen.getByRole("heading", { level: 2, name: "A few things, before we begin." });
    const intro = screen.getByText("Only paragraph.");
    expect(lead.compareDocumentPosition(giftRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(giftRow.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(giftRow.compareDocumentPosition(intro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel })).toBeInTheDocument();
  });

  it("renders no gift row without giftFold", () => {
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]))} />);

    expect(screen.queryByTestId("gift-fold")).toBeNull();
  });
});

const TESTIMONIAL = { label: "From a client", quote: "It named what I felt.", name: "Ada" };

describe("BookingFormView page order", () => {
  it("leaves out a hidden element", () => {
    const layout = resolveBookingPageLayout([{ element: "otherReadings", hidden: true }]);
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]), layout)} />);

    expect(screen.queryByRole("navigation", { name: "Not sure this is the one?" })).toBeNull();
    expect(screen.getByText(SOUL_BLUEPRINT_BLOCK.lead)).toBeInTheDocument();
  });

  it("renders elements placed after the form below the card", () => {
    const entries = defaultBookingPageLayoutEntries().filter((entry) => entry.element !== "otherReadings");
    const layout = resolveBookingPageLayout([...entries, { element: "otherReadings" }]);
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]), layout)} />);

    const otherReadings = screen.getByRole("navigation", { name: "Not sure this is the one?" });
    expect(otherReadings.closest("article")).toBeNull();
    expect(screen.getByText(SOUL_BLUEPRINT_BLOCK.lead).closest("article")).not.toBeNull();
  });

  it("puts the testimonial inside the form by default", () => {
    const base = props(paragraphBlocks(["Only paragraph."]));
    render(<BookingFormView {...base} form={{ ...base.form, testimonial: TESTIMONIAL }} />);

    expect(intakeForm.mock.lastCall?.[0].testimonial).toEqual(TESTIMONIAL);
    expect(screen.queryByText(/It named what I felt/)).toBeNull();
  });

  it("shows the testimonial on the page instead of in the form when moved out", () => {
    const layout = resolveBookingPageLayout([{ element: "testimonial", insideForm: false }, { element: "form" }]);
    const base = props(paragraphBlocks(["Only paragraph."]), layout);
    render(<BookingFormView {...base} form={{ ...base.form, testimonial: TESTIMONIAL }} />);

    expect(intakeForm.mock.lastCall?.[0].testimonial).toBeUndefined();
    expect(screen.getByText(/It named what I felt/)).toBeInTheDocument();
  });
});

describe("BookingFormView intro bullets", () => {
  it("renders bullet items from the intro with the site's checkmark", () => {
    const intro: SanityPortableTextBlock[] = [
      {
        _type: "block",
        _key: "l0",
        style: "normal",
        listItem: "bullet",
        level: 1,
        markDefs: [],
        children: [{ _type: "span", _key: "l0-0", text: "Your date of birth", marks: [] }],
      },
    ];
    render(<BookingFormView {...props(intro)} />);

    const item = screen.getByText("Your date of birth").closest("li");
    expect(item?.querySelector("svg")).not.toBeNull();
    expect(item?.closest("ul")).not.toHaveClass("list-disc");
  });
});
