import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => trackMock(...args) }));

import { ArticleViewTracker } from "./ArticleViewTracker";

function landedOn(url: string) {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([{ name: url } as PerformanceEntry]);
}

afterEach(() => {
  trackMock.mockReset();
  vi.restoreAllMocks();
});

describe("ArticleViewTracker", () => {
  it("sends the external referrer when the visitor landed on this note", () => {
    landedOn(window.location.href);
    vi.spyOn(document, "referrer", "get").mockReturnValue("https://www.tiktok.com/");
    render(<ArticleViewTracker note="birth-time" />);
    expect(trackMock).toHaveBeenCalledWith(
      "article_view",
      expect.objectContaining({ note: "birth-time", referrer: "https://www.tiktok.com/" }),
    );
  });

  it("marks an in-site navigation as internal, not the landing referrer", () => {
    landedOn("https://withjosephine.com/notes/another-note");
    vi.spyOn(document, "referrer", "get").mockReturnValue("https://www.tiktok.com/");
    render(<ArticleViewTracker note="birth-time" />);
    expect(trackMock).toHaveBeenCalledWith(
      "article_view",
      expect.objectContaining({ referrer: "internal" }),
    );
  });
});
