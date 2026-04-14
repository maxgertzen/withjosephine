import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Navigation } from "./Navigation";

describe("Navigation", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<Navigation />);

    expect(screen.getAllByText("Josephine")).toHaveLength(1);
    expect(screen.getAllByText("Readings")).toHaveLength(2); // desktop + mobile
    expect(screen.getAllByText("About")).toHaveLength(2);
    expect(screen.getAllByText("How It Works")).toHaveLength(2);
    expect(screen.getAllByText("Contact")).toHaveLength(2);
    expect(screen.getAllByText("Book a Reading")).toHaveLength(2);
  });

  it("renders Sanity content when provided", () => {
    const content = {
      brandName: "Custom Brand",
      navLinks: [
        { label: "Services", sectionId: "services" },
        { label: "Info", sectionId: "info" },
      ],
      navCtaText: "Get Started",
    };

    render(<Navigation content={content} />);

    expect(screen.getAllByText("Custom Brand")).toHaveLength(1);
    expect(screen.getAllByText("Services")).toHaveLength(2);
    expect(screen.getAllByText("Info")).toHaveLength(2);
    expect(screen.getAllByText("Get Started")).toHaveLength(2);
    expect(screen.queryByText("Readings")).not.toBeInTheDocument();
  });
});
