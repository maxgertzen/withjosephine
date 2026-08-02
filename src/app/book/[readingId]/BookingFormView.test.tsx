import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/IntakeForm", () => ({
  IntakeForm: () => null,
}));

import { paragraphBlocks } from "@/lib/copy/paragraphBlocks";
import type { SanityPortableTextBlock } from "@/lib/sanity/types";

import { BookingFormView, type BookingFormViewProps } from "./BookingFormView";

function props(intro: SanityPortableTextBlock[]): BookingFormViewProps {
  return {
    backHref: "/#reading-birth-chart",
    reading: {
      slug: "birth-chart",
      tag: "Astrology",
      name: "Birth Chart Reading",
      priceLabel: "$89",
    },
    copy: { title: "A few things, before we begin.", intro },
    form: { sections: [], nonRefundableNotice: "Non-refundable." },
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
    render(<BookingFormView {...props(paragraphBlocks(["First paragraph.", "Second paragraph."]))} />);

    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  it("renders bold marks authored in Sanity", () => {
    render(<BookingFormView {...props(BOLD_INTRO)} />);

    const bold = screen.getByText("time");
    expect(bold.tagName).toBe("STRONG");
  });

  it("renders the heading", () => {
    render(<BookingFormView {...props(paragraphBlocks(["Only paragraph."]))} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "A few things, before we begin." }),
    ).toBeInTheDocument();
  });
});
