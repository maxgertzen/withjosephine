import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNavigationHistory } from "@/test/navigationHistory";

import { BookingFlowHeader } from "./BookingFlowHeader";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

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

  it("links to the page the visitor came from on this site and steps back on a click", async () => {
    const { traverseTo } = stubNavigationHistory([
      "/notes/what-your-chart-shows",
      "/book/soul-blueprint",
    ]);
    render(<BookingFlowHeader backHref="/#reading-soul-blueprint" />);

    const link = screen.getByRole("link", { name: /Back/ });
    expect(link).toHaveAttribute("href", "/notes/what-your-chart-shows");
    await userEvent.click(link);

    expect(traverseTo).toHaveBeenCalledExactlyOnceWith("entry-0");
  });

  it("links to the homepage card when there is no page on this site behind it", () => {
    stubNavigationHistory(["/book/soul-blueprint"]);
    render(<BookingFlowHeader backHref="/#reading-soul-blueprint" />);

    expect(screen.getByRole("link", { name: /Back/ })).toHaveAttribute(
      "href",
      "/#reading-soul-blueprint",
    );
  });
});
