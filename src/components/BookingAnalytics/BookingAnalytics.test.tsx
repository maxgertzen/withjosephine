import { act, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));

import type * as BookingEntryContextModule from "@/lib/intake/bookingEntryContext";
import type * as EntryMarkerModule from "@/lib/intake/entryMarker";

import type * as BookingAnalyticsModule from "./BookingAnalytics";

let EntryPageView: typeof BookingAnalyticsModule.EntryPageView;
let markEntryClick: typeof EntryMarkerModule.markEntryClick;
let BookingEntryProvider: typeof BookingEntryContextModule.BookingEntryProvider;
let useBookingEntry: typeof BookingEntryContextModule.useBookingEntry;

function Page({ children }: { children?: ReactNode }) {
  return (
    <BookingEntryProvider readingId="soul-blueprint">
      <EntryPageView readingId="soul-blueprint" />
      {children}
    </BookingEntryProvider>
  );
}

beforeEach(async () => {
  vi.resetModules();
  ({ EntryPageView } = await import("./BookingAnalytics"));
  ({ markEntryClick } = await import("@/lib/intake/entryMarker"));
  ({ BookingEntryProvider, useBookingEntry } = await import("@/lib/intake/bookingEntryContext"));
  vi.clearAllMocks();
  window.localStorage.clear();
  Object.defineProperty(document, "referrer", {
    value: "https://example.com/source",
    configurable: true,
  });
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("EntryPageView", () => {
  it("fires entry_page_view exactly once on mount with referrer, viewport, entry and fold state", async () => {
    await act(async () => {
      render(<Page />);
    });
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "https://example.com/source",
      viewport_width: 1280,
      entry: "external",
      folded: false,
    });
  });

  it("reports a homepage card visitor as folded", async () => {
    markEntryClick("soul-blueprint", "homepage_card");
    await act(async () => {
      render(<Page />);
    });
    expect(track).toHaveBeenCalledWith(
      "entry_page_view",
      expect.objectContaining({ entry: "homepage_card", folded: true }),
    );
  });

  it("does not fire again on re-render with the same readingId", async () => {
    let rerender: ReturnType<typeof render>["rerender"] | undefined;
    await act(async () => {
      const r = render(<Page />);
      rerender = r.rerender;
    });
    await act(async () => {
      rerender!(<Page />);
    });
    expect(track).toHaveBeenCalledOnce();
  });

  it("gives the fold and the page view the same classification of one homepage card tap", async () => {
    const seen: (string | null)[] = [];
    function FoldProbe() {
      seen.push(useBookingEntry());
      return null;
    }
    markEntryClick("soul-blueprint", "homepage_card");
    await act(async () => {
      render(
        <Page>
          <FoldProbe />
        </Page>,
      );
    });
    expect(seen.at(-1)).toBe("homepage_card");
    expect(track).toHaveBeenCalledWith(
      "entry_page_view",
      expect.objectContaining({ entry: "homepage_card", folded: true }),
    );
  });

  it("records a reading switch as its own entry, with the block open", async () => {
    markEntryClick("soul-blueprint", "reading_switch");
    await act(async () => {
      render(<Page />);
    });
    expect(track).toHaveBeenCalledWith(
      "entry_page_view",
      expect.objectContaining({ entry: "reading_switch", folded: false }),
    );
  });

  it("does not fire outside a BookingEntryProvider", async () => {
    await act(async () => {
      render(<EntryPageView readingId="soul-blueprint" />);
    });
    expect(track).not.toHaveBeenCalled();
  });

  it("renders no DOM output", async () => {
    let containerRef: HTMLElement | undefined;
    await act(async () => {
      const { container } = render(<Page />);
      containerRef = container;
    });
    expect(containerRef!.firstChild).toBeNull();
  });
});
