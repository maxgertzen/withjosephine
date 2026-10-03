import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearEntryClick,
  clearEntryClickAwayFrom,
  ENTRY_CLICK_TTL_MS,
  markEntryClick,
  pendingEntryClick,
} from "./entryMarker";

beforeEach(() => {
  clearEntryClick();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("entry click marker", () => {
  it("matches only the clicked slug and kind of click", () => {
    markEntryClick("birth-chart", "reading_switch");

    expect(pendingEntryClick("birth-chart")).toBe("reading_switch");
    expect(pendingEntryClick("soul-blueprint")).toBeNull();
  });

  it("keeps only the latest click, so an abandoned reading switch cannot leak into a later card tap", () => {
    markEntryClick("birth-chart", "reading_switch");
    markEntryClick("birth-chart", "homepage_card");

    expect(pendingEntryClick("birth-chart")).toBe("homepage_card");
  });

  it("is cleared when a route other than the clicked reading's booking page loads", () => {
    markEntryClick("birth-chart", "reading_switch");
    clearEntryClickAwayFrom("/notes");

    expect(pendingEntryClick("birth-chart")).toBeNull();
  });

  it("survives the clicked reading's own booking page loading", () => {
    markEntryClick("birth-chart", "reading_switch");
    clearEntryClickAwayFrom("/book/birth-chart");

    expect(pendingEntryClick("birth-chart")).toBe("reading_switch");
  });

  it("expires after the TTL", () => {
    markEntryClick("birth-chart", "reading_switch");
    vi.setSystemTime(Date.now() + ENTRY_CLICK_TTL_MS + 1);

    expect(pendingEntryClick("birth-chart")).toBeNull();
  });
});
