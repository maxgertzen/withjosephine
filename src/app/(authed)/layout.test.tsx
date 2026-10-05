import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchSiteSettingsPublished: () => new Promise(() => {}),
  fetchNotesStatePublished: () => new Promise(() => {}),
}));

import AuthedLayout from "./layout";

describe("AuthedLayout", () => {
  it("renders the homepage nav bar, with section links pointing at the homepage, while Sanity loads", () => {
    render(AuthedLayout({ children: <div>child</div> }));

    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Readings" })).toHaveAttribute(
      "href",
      "/#readings",
    );
    expect(within(nav).getByRole("link", { name: "Book a Reading" })).toHaveAttribute(
      "href",
      "/#readings",
    );
    expect(within(nav).queryByRole("link", { current: "page" })).toBeNull();
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
