import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingFlowHeader } from "./BookingFlowHeader";

describe("BookingFlowHeader", () => {
  it("renders a Back link with the supplied href and label", () => {
    render(<BookingFlowHeader backHref="/book/soul-blueprint" backLabel="‹ Back" />);
    const back = screen.getByRole("link", { name: /Back/ });
    expect(back).toHaveAttribute("href", "/book/soul-blueprint");
  });

  it("links the Josephine Soul Readings wordmark to the home page", () => {
    render(<BookingFlowHeader backHref="/book/soul-blueprint" />);
    const home = screen.getByRole("link", { name: /Josephine Soul Readings/ });
    expect(home).toHaveAttribute("href", "/");
  });

  it("renders the About Josephine link", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(
      screen.getByRole("link", { name: "About Josephine" }),
    ).toHaveAttribute("href", "/#about");
  });
});
