import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./LinksPageView", () => ({ LinksPageView: () => null }));
vi.mock("./fonts", () => ({ linksPageFontVariables: () => ({}) }));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchLinksPagePublished: vi.fn(),
  fetchNotesStatePublished: vi.fn(),
  fetchReadingsPublished: vi.fn(),
  fetchSiteSettingsPublished: vi.fn(),
}));

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchLinksPagePublished } from "@/lib/sanity/fetch";

import { generateMetadata } from "./page";

const mockFetchLinksPage = vi.mocked(fetchLinksPagePublished);

beforeEach(() => {
  mockFetchLinksPage.mockReset();
});

describe("links page metadata", () => {
  it("keeps the page out of search results while letting its links be followed", async () => {
    mockFetchLinksPage.mockResolvedValue(null);
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "https://links.withjosephine.com/" });
  });

  it("uses the built-in title and line when the link preview fields are blank", async () => {
    mockFetchLinksPage.mockResolvedValue({ page: { seo: { metaTitle: " " } }, aboutPhotoUrl: null });
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(LINKS_PAGE_DEFAULTS.metaTitle);
    expect(metadata.description).toBe(LINKS_PAGE_DEFAULTS.metaDescription);
  });

  it("uses the page's own preview picture, and the site default card when none is set", async () => {
    mockFetchLinksPage.mockResolvedValue({
      page: { seo: { ogImage: { asset: { url: "https://cdn.sanity.io/own.jpg" } } } },
      aboutPhotoUrl: null,
    });
    expect(JSON.stringify((await generateMetadata()).openGraph)).toContain("own.jpg");

    mockFetchLinksPage.mockResolvedValue({ page: null, aboutPhotoUrl: null });
    expect(JSON.stringify((await generateMetadata()).openGraph)).toContain("/og-image.png");
  });
});
