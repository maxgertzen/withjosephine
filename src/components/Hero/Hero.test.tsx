import { render, screen } from "@testing-library/react";
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

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, ...props }: Record<string, unknown>) => <img alt={alt as string} {...props} />,
}));

import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders h1 for SEO", () => {
    render(<Hero />);

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders default tagline when no content provided", () => {
    render(<Hero />);

    expect(screen.getByText("Astrologer + Akashic Record Reader")).toBeInTheDocument();
  });

  it("renders custom content when provided", () => {
    const content = {
      tagline: "Custom Tagline",
      introGreeting: "Hello there.",
      introBody: "First paragraph.\n\nSecond paragraph.",
      ctaText: "Get Started",
    };

    render(<Hero content={content} />);

    expect(screen.getByText("Custom Tagline")).toBeInTheDocument();
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Get Started")).toBeInTheDocument();
  });

  it("renders CTA button with default text", () => {
    render(<Hero />);

    expect(screen.getByRole("button", { name: "Explore Readings" })).toBeInTheDocument();
  });

  it("scrolls to readings section on CTA click", () => {
    const mockScrollIntoView = vi.fn();
    const mockElement = { scrollIntoView: mockScrollIntoView };
    vi.spyOn(document, "getElementById").mockReturnValue(mockElement as unknown as HTMLElement);

    render(<Hero />);

    screen.getByRole("button", { name: "Explore Readings" }).click();

    expect(document.getElementById).toHaveBeenCalledWith("readings");
    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
  });
});
