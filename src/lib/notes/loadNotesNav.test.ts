import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSiteSettingsPublished = vi.fn();
const fetchNotesStatePublished = vi.fn();

vi.mock("@/lib/sanity/fetch", () => ({
  fetchSiteSettingsPublished: () => fetchSiteSettingsPublished(),
  fetchNotesStatePublished: () => fetchNotesStatePublished(),
}));

import { loadNotesNav } from "./loadNotesNav";
import { notesNav } from "./notesChrome";

describe("loadNotesNav", () => {
  beforeEach(() => {
    fetchSiteSettingsPublished.mockResolvedValue(null);
    fetchNotesStatePublished.mockResolvedValue(null);
  });

  it("maps the nav labels from site settings", async () => {
    const siteSettings = {
      navLinks: [{ label: "The Readings", sectionId: "readings" }],
      navCtaText: "Begin",
    };
    fetchSiteSettingsPublished.mockResolvedValue(siteSettings);

    expect(await loadNotesNav()).toEqual(notesNav(siteSettings as never, null));
  });

  it("falls back to the default nav when Sanity fails", async () => {
    fetchSiteSettingsPublished.mockRejectedValue(new Error("sanity down"));
    fetchNotesStatePublished.mockRejectedValue(new Error("sanity down"));

    expect(await loadNotesNav()).toEqual(notesNav(null, null));
  });
});
