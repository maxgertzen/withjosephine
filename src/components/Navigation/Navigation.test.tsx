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

describe("Navigation Notes item and off-homepage links", () => {
  const notesLink = { label: "Notes", href: "/notes" };

  it("adds a Notes link on the homepage, not marked current, while sections still scroll", () => {
    render(<Navigation notesLink={notesLink} />);

    const desktop = screen.getByRole("navigation", { name: "Primary" });
    expect(within(desktop).getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/notes");
    expect(within(desktop).getByRole("button", { name: "Readings" })).toBeInTheDocument();
    expect(within(desktop).getByRole("link", { name: "Notes" })).not.toHaveAttribute("aria-current");
  });

  it("orders Notes directly before Contact", () => {
    render(<Navigation notesLink={notesLink} page="notes" />);

    const desktop = screen.getByRole("navigation", { name: "Primary" });
    const order = within(desktop)
      .getAllByRole("link")
      .map((link) => link.textContent);
    expect(order.indexOf("Notes")).toBe(order.indexOf("Contact") - 1);
  });

  it("links sections and the button to the homepage and marks Notes current on Notes pages", () => {
    render(<Navigation notesLink={notesLink} page="notes" />);

    const desktop = screen.getByRole("navigation", { name: "Primary" });
    expect(within(desktop).getByRole("link", { name: "Readings" })).toHaveAttribute(
      "href",
      "/#readings",
    );
    expect(within(desktop).getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "/#contact",
    );
    expect(within(desktop).getByRole("link", { name: "Book a Reading" })).toHaveAttribute(
      "href",
      "/#readings",
    );
    expect(within(desktop).getByRole("link", { name: "Notes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows no Notes item when Notes is not visible", () => {
    render(<Navigation />);
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
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

  it("traps Tab through the overlay and the close button (last→close, shift+Tab close→last)", () => {
    render(<Navigation />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    const closeToggle = screen.getByLabelText("Close menu");
    const buttons = overlayButtons();
    const lastOverlay = buttons[buttons.length - 1];

    lastOverlay.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(closeToggle);

    closeToggle.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastOverlay);
  });
});
