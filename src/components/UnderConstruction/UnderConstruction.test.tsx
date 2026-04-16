import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UnderConstruction } from "./UnderConstruction";

describe("UnderConstruction", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<UnderConstruction />);
    expect(screen.getByText("Josephine")).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      tag: "\u2726 Almost There",
      heading: "Launching Soon",
      description: "We're preparing something magical.",
      imageUrl: "https://cdn.sanity.io/images/test.png",
      imageAlt: "Custom alt text",
      contactText: "Questions? Email us at",
    };

    render(<UnderConstruction content={content} />);

    expect(screen.getByText("Launching Soon")).toBeInTheDocument();
    expect(screen.getByText(/something magical/i)).toBeInTheDocument();
    expect(screen.getByText(/Questions\? Email us at/)).toBeInTheDocument();
  });

  it("includes the contact email", () => {
    render(<UnderConstruction />);
    expect(screen.getByRole("link", { name: /hello@withjosephine\.com/i })).toHaveAttribute(
      "href",
      "mailto:hello@withjosephine.com",
    );
  });
});
