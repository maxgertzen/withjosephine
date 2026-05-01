import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  track: vi.fn(),
}));

import { track } from "@/lib/analytics";

import { EntryPageView, TrackedLink } from "./BookingAnalytics";

beforeEach(() => {
  vi.clearAllMocks();
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
  it("fires entry_page_view exactly once on mount with referrer + viewport_width", async () => {
    await act(async () => {
      render(<EntryPageView readingId="soul-blueprint" />);
    });
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "https://example.com/source",
      viewport_width: 1280,
    });
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

describe("TrackedLink", () => {
  it("fires the typed event on click before navigation", async () => {
    const user = userEvent.setup();
    render(
      <TrackedLink
        href="/somewhere"
        event="cta_click_intake"
        properties={{ reading_id: "akashic-record", position: "verso-cta" }}
      >
        Book this Reading
      </TrackedLink>,
    );
    await user.click(screen.getByRole("link", { name: /book this reading/i }));
    expect(track).toHaveBeenCalledWith("cta_click_intake", {
      reading_id: "akashic-record",
      position: "verso-cta",
    });
  });

  it("forwards href, className, and arbitrary Link props through", () => {
    render(
      <TrackedLink
        href="/destination"
        className="custom-class"
        aria-label="aria-label-test"
        event="change_reading_click"
        properties={{ from_reading_id: "birth-chart" }}
      >
        Change reading
      </TrackedLink>,
    );
    const link = screen.getByRole("link", { name: "aria-label-test" });
    expect(link).toHaveAttribute("href", "/destination");
    expect(link).toHaveClass("custom-class");
  });

  it("does not fire the event on initial render (only on click)", () => {
    render(
      <TrackedLink
        href="/x"
        event="change_reading_click"
        properties={{ from_reading_id: "soul-blueprint" }}
      >
        Click me
      </TrackedLink>,
    );
    expect(track).not.toHaveBeenCalled();
  });
});
