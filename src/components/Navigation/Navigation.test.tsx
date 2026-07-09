import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Navigation } from "./Navigation";

function overlayButtons() {
  const overlay = screen.getByRole("navigation", { name: "Mobile navigation" }).parentElement!;
  return within(overlay).getAllByRole("button");
}

describe("Navigation", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<Navigation />);

    expect(screen.getAllByAltText("Josephine Soul Readings")).toHaveLength(2); // mobile + desktop logo
    expect(screen.getAllByText("Readings")).toHaveLength(2); // desktop + mobile
    expect(screen.getAllByText("About")).toHaveLength(2);
    expect(screen.getAllByText("How It Works")).toHaveLength(2);
    expect(screen.getAllByText("Contact")).toHaveLength(2);
    expect(screen.getAllByText("Book a Reading")).toHaveLength(2);
  });

  it("renders Sanity content when provided", () => {
    const content = {
      navLinks: [
        { label: "Services", sectionId: "services" },
        { label: "Info", sectionId: "info" },
      ],
      navCtaText: "Get Started",
    };

    render(<Navigation content={content} />);

    expect(screen.getAllByAltText("Josephine Soul Readings")).toHaveLength(2);
    expect(screen.getAllByText("Services")).toHaveLength(2);
    expect(screen.getAllByText("Info")).toHaveLength(2);
    expect(screen.getAllByText("Get Started")).toHaveLength(2);
    expect(screen.queryByText("Readings")).not.toBeInTheDocument();
  });
});

describe("Navigation mobile overlay focus management", () => {
  it("moves focus into the overlay when opened", () => {
    render(<Navigation />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(overlayButtons()).toContain(document.activeElement);
  });

  it("closes on Escape and restores focus to the toggle", () => {
    render(<Navigation />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    const toggle = screen.getByLabelText("Close menu");
    fireEvent.keyDown(document, { key: "Escape" });
    const reopened = screen.getByLabelText("Open menu");
    expect(reopened).toBe(toggle);
    expect(document.activeElement).toBe(reopened);
  });

  it("traps Tab within the overlay (last wraps to first, shift+Tab first wraps to last)", () => {
    render(<Navigation />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    const buttons = overlayButtons();
    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
