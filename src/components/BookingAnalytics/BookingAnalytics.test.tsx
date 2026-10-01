import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { track } = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ track }));

import { markHomepageCardEntry } from "@/lib/intake/homepageCardEntry";

import type * as BookingAnalyticsModule from "./BookingAnalytics";

let EntryPageView: typeof BookingAnalyticsModule.EntryPageView;

beforeEach(async () => {
  vi.resetModules();
  ({ EntryPageView } = await import("./BookingAnalytics"));
  vi.clearAllMocks();
  window.sessionStorage.clear();
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
      render(<EntryPageView readingId="soul-blueprint" />);
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
    markHomepageCardEntry("soul-blueprint");
    await act(async () => {
      render(<EntryPageView readingId="soul-blueprint" />);
    });
    expect(track).toHaveBeenCalledWith(
      "entry_page_view",
      expect.objectContaining({ entry: "homepage_card", folded: true }),
    );
  });

  it("does not fire again on re-render with the same readingId", async () => {
    let rerender: ReturnType<typeof render>["rerender"] | undefined;
    await act(async () => {
      const r = render(<EntryPageView readingId="soul-blueprint" />);
      rerender = r.rerender;
    });
    await act(async () => {
      rerender!(<EntryPageView readingId="soul-blueprint" />);
    });
    expect(track).toHaveBeenCalledOnce();
  });

  it("renders no DOM output", async () => {
    let containerRef: HTMLElement | undefined;
    await act(async () => {
      const { container } = render(<EntryPageView readingId="soul-blueprint" />);
      containerRef = container;
    });
    expect(containerRef!.firstChild).toBeNull();
  });
});
