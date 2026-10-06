import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/gift/K7M2QX9PH4TR" }));

import { BookingEntryProvider, useBookingEntry } from "./bookingEntryContext";
import { save as saveDraft } from "./localStorageDraft";

function EntryProbe() {
  return <p>{useBookingEntry() ?? "unknown"}</p>;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("BookingEntryProvider", () => {
  it("uses the given entry over the peeked one, even with a saved draft", () => {
    saveDraft("birth-chart", { currentPage: 0, values: { email: "anna@example.com" } });

    render(
      <BookingEntryProvider readingId="birth-chart" entry="gift">
        <EntryProbe />
      </BookingEntryProvider>,
    );

    expect(screen.getByText("gift")).toBeInTheDocument();
  });

  it("gives the given entry on the server render, so the fold is closed on first paint", () => {
    const html = renderToString(
      <BookingEntryProvider readingId="birth-chart" entry="gift">
        <EntryProbe />
      </BookingEntryProvider>,
    );

    expect(html).toContain("gift");
  });
});
