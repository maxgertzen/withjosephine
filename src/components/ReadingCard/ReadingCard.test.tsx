import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", () => {
  function createMotionComponent(tag: string) {
    return function MotionComponent({ children, className, style, onClick }: Record<string, unknown>) {
      return React.createElement(tag, { className, style, onClick }, children as React.ReactNode);
    };
  }

  return {
    motion: {
      div: createMotionComponent("div"),
      p: createMotionComponent("p"),
      section: createMotionComponent("section"),
      span: createMotionComponent("span"),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));

import { ReadingCard } from "./ReadingCard";

const defaultProps = {
  slug: "soul-blueprint",
  tag: "✦ Signature",
  name: "Soul Blueprint",
  price: "$179",
  valueProposition: "The complete picture of your soul's design.",
  briefDescription: "A deep dive into your birth chart and Akashic Records.",
  expandedDetails: ["Full birth chart analysis", "Akashic Record insights", "Voice note + PDF"],
  href: "/book/soul-blueprint",
};

describe("ReadingCard", () => {
  it("renders card content", () => {
    render(<ReadingCard {...defaultProps} />);

    expect(screen.getByText("✦ Signature")).toBeInTheDocument();
    expect(screen.getByText("Soul Blueprint")).toBeInTheDocument();
    expect(screen.getByText("$179")).toBeInTheDocument();
    expect(screen.getByText(defaultProps.valueProposition)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.briefDescription)).toBeInTheDocument();
  });

  it("does not show expanded details initially", () => {
    render(<ReadingCard {...defaultProps} />);

    expect(screen.queryByText("Full birth chart analysis")).not.toBeInTheDocument();
  });

  it("toggles expanded details on Learn More click", async () => {
    const user = userEvent.setup();
    render(<ReadingCard {...defaultProps} />);

    await user.click(screen.getByText("Learn More ↓"));

    expect(screen.getByText("Full birth chart analysis")).toBeInTheDocument();
    expect(screen.getByText("Akashic Record insights")).toBeInTheDocument();
    expect(screen.getByText("Voice note + PDF")).toBeInTheDocument();
  });

  it("toggles aria-expanded attribute", async () => {
    const user = userEvent.setup();
    render(<ReadingCard {...defaultProps} />);

    const toggleButton = screen.getByText("Learn More ↓");
    expect(toggleButton).toHaveAttribute("aria-expanded", "false");

    await user.click(toggleButton);
    expect(screen.getByText("Show Less ↑")).toHaveAttribute("aria-expanded", "true");
  });

  it("renders booking link with correct href", () => {
    render(<ReadingCard {...defaultProps} />);

    const bookingLink = screen.getByRole("link", { name: "Book This Reading" });
    expect(bookingLink).toHaveAttribute("href", "/book/soul-blueprint");
  });
});
