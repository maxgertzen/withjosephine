import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearEntryClick, ENTRY_CLICK_TTL_MS, markEntryClick, peekEntryClick } from "./entryMarker";

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

    expect(peekEntryClick("birth-chart", "reading_switch")).toBe(true);
    expect(peekEntryClick("birth-chart", "homepage_card")).toBe(false);
    expect(peekEntryClick("soul-blueprint", "reading_switch")).toBe(false);
  });

  it("keeps only the latest click, so an abandoned reading switch cannot leak into a later card tap", () => {
    markEntryClick("birth-chart", "reading_switch");
    markEntryClick("birth-chart", "homepage_card");

    expect(peekEntryClick("birth-chart", "reading_switch")).toBe(false);
    expect(peekEntryClick("birth-chart", "homepage_card")).toBe(true);
  });

  it("expires after the TTL", () => {
    markEntryClick("birth-chart", "reading_switch");
    vi.setSystemTime(Date.now() + ENTRY_CLICK_TTL_MS + 1);

    expect(peekEntryClick("birth-chart", "reading_switch")).toBe(false);
  });
});
