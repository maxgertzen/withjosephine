import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingFlowHeader } from "./BookingFlowHeader";

describe("BookingFlowHeader", () => {
  it("renders a Back link with the supplied href and label", () => {
    render(<BookingFlowHeader backHref="/#reading-soul-blueprint" backLabel="Back" />);
    const back = screen.getByRole("link", { name: /Back/ });
    expect(back).toHaveAttribute("href", "/#reading-soul-blueprint");
  });

  it("holds only the Back link, no heading", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("no longer renders the Josephine Soul Readings wordmark", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(screen.queryByText(/Josephine Soul Readings/)).toBeNull();
  });

  it("no longer renders an account menu", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(screen.queryByTestId("account-menu")).toBeNull();
    expect(screen.queryByRole("button", { name: /account/i })).toBeNull();
  });

  it("no longer renders an About Josephine link", () => {
    render(<BookingFlowHeader backHref="/" />);
    expect(screen.queryByRole("link", { name: "About Josephine" })).toBeNull();
  });
});
