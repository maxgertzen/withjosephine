import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSiteSettingsPublished = vi.fn();
const fetchNotesStatePublished = vi.fn();

vi.mock("@/lib/sanity/fetch", () => ({
  fetchSiteSettingsPublished: () => fetchSiteSettingsPublished(),
  fetchNotesStatePublished: () => fetchNotesStatePublished(),
}));

import { loadSiteChrome } from "./loadSiteChrome";
import { notesFooter, notesNav } from "./notesChrome";

describe("loadSiteChrome", () => {
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

    expect((await loadSiteChrome()).nav).toEqual(notesNav(siteSettings as never, null));
  });

  it("maps the footer from the same site settings", async () => {
    const siteSettings = { copyrightText: "Josephine, 2026" };
    fetchSiteSettingsPublished.mockResolvedValue(siteSettings);

    expect((await loadSiteChrome()).footer).toEqual(notesFooter(siteSettings as never, null));
  });

  it("falls back to the default nav when Sanity fails", async () => {
    fetchSiteSettingsPublished.mockRejectedValue(new Error("sanity down"));
    fetchNotesStatePublished.mockRejectedValue(new Error("sanity down"));

    expect((await loadSiteChrome()).nav).toEqual(notesNav(null, null));
  });
});
