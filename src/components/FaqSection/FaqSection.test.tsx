import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { MappedFaqItem } from "@/lib/sanity/mappers";

import { FaqSection } from "./FaqSection";

const FAQ_ITEMS: MappedFaqItem[] = [
  {
    id: "faq-1",
    question: "How long does a reading take?",
    answer: "You'll receive your reading within 7 business days.",
  },
  {
    id: "faq-2",
    question: "What do I need to provide?",
    answer: "Your birth date, time, and location.",
  },
];

describe("FaqSection", () => {
  it("renders nothing when items array is empty", () => {
    const { container } = render(<FaqSection items={[]} />);

    expect(container.querySelector("section")).not.toBeInTheDocument();
  });

  it("renders section heading and all questions", () => {
    render(<FaqSection items={FAQ_ITEMS} />);

    expect(screen.getByText("frequently asked questions")).toBeInTheDocument();
    expect(screen.getByText("How long does a reading take?")).toBeInTheDocument();
    expect(screen.getByText("What do I need to provide?")).toBeInTheDocument();
  });

  it("answers are hidden by default", () => {
    render(<FaqSection items={FAQ_ITEMS} />);

    const regions = screen.queryAllByRole("region");
    expect(regions).toHaveLength(0);
  });

  it("expands answer when question is clicked", async () => {
    const user = userEvent.setup();
    render(<FaqSection items={FAQ_ITEMS} />);

    await user.click(screen.getByText("How long does a reading take?"));

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(
      screen.getByText("You'll receive your reading within 7 business days."),
    ).toBeInTheDocument();
  });

  it("accepts custom section heading from Sanity", () => {
    render(
      <FaqSection items={FAQ_ITEMS} sectionTag="✦ Questions" heading="your questions answered" />,
    );

    expect(screen.getByText("your questions answered")).toBeInTheDocument();
    expect(screen.getByText("✦ Questions")).toBeInTheDocument();
  });

  it("renders JSON-LD structured data", () => {
    const { container } = render(<FaqSection items={FAQ_ITEMS} />);

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const jsonLd = JSON.parse(script!.textContent!);
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(2);
    expect(jsonLd.mainEntity[0].name).toBe("How long does a reading take?");
    expect(jsonLd.mainEntity[0].acceptedAnswer.text).toBe(
      "You'll receive your reading within 7 business days.",
    );
  });
});
