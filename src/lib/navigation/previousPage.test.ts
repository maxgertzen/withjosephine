import { afterEach, describe, expect, it, vi } from "vitest";

import { stubNavigationHistory } from "@/test/navigationHistory";

import { previousPageOnThisSite } from "./previousPage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("previousPageOnThisSite", () => {
  it("names the page on this site right behind the current one", () => {
    stubNavigationHistory(["/notes/chart", "/book/a"]);

    expect(previousPageOnThisSite()).toBe("/notes/chart");
  });

  it("offers nothing when this is the first page of the site in the tab, as after Google", () => {
    stubNavigationHistory(["/book/a"]);

    expect(previousPageOnThisSite()).toBeNull();
  });

  it("offers nothing for an entry from another origin", () => {
    stubNavigationHistory(["https://www.google.com/search", "/book/a"]);

    expect(previousPageOnThisSite()).toBeNull();
  });

  it("keeps the query and hash of the previous page", () => {
    stubNavigationHistory(["/#reading-soul-blueprint", "/book/soul-blueprint"]);

    expect(previousPageOnThisSite()).toBe("/#reading-soul-blueprint");
  });

  it("skips entries of the current page that differ only by hash, like the skip link", () => {
    stubNavigationHistory(["/notes/chart", "/book/a", "/book/a#main"]);

    expect(previousPageOnThisSite()).toBe("/notes/chart");
  });

  it("offers nothing when every earlier entry is the current page", () => {
    stubNavigationHistory(["/book/a", "/book/a#main"]);

    expect(previousPageOnThisSite()).toBeNull();
  });

  describe("without the Navigation API", () => {
    function landOn(path: string, referrer: string, historyLength: number) {
      window.history.replaceState(null, "", path);
      vi.spyOn(document, "referrer", "get").mockReturnValue(referrer);
      vi.spyOn(window.history, "length", "get").mockReturnValue(historyLength);
    }

    it("uses a referrer on this site", () => {
      landOn("/privacy", `${window.location.origin}/book/a`, 2);

      expect(previousPageOnThisSite()).toBe("/book/a");
    });

    it("offers nothing for a referrer from another origin", () => {
      landOn("/privacy", "https://www.google.com/", 2);

      expect(previousPageOnThisSite()).toBeNull();
    });

    it("offers nothing in a fresh tab opened from this site", () => {
      landOn("/privacy", `${window.location.origin}/book/a`, 1);

      expect(previousPageOnThisSite()).toBeNull();
    });

    it("offers nothing without a referrer", () => {
      landOn("/privacy", "", 2);

      expect(previousPageOnThisSite()).toBeNull();
    });
  });
});
