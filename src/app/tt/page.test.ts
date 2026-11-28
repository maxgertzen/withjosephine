import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./LinksPageView", () => ({ LinksPageView: () => null }));
vi.mock("./fonts", () => ({ linksPageFontVariables: () => ({}) }));

vi.mock("@/lib/sanity/fetch", () => ({ fetchLinksPagePublished: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { redirect } from "next/navigation";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchLinksPagePublished } from "@/lib/sanity/fetch";
import type { SanityLinksPageState } from "@/lib/sanity/types";

import LinksPage, { generateMetadata } from "./page";

const mockFetchLinksPage = vi.mocked(fetchLinksPagePublished);

const linksPageState = (page: SanityLinksPageState["page"]): SanityLinksPageState => ({
  page,
  aboutPhotoUrl: null,
  readings: [],
  notesState: null,
  siteSettings: null,
});

beforeEach(() => {
  mockFetchLinksPage.mockReset();
  vi.mocked(redirect).mockClear();
});

describe("links page metadata", () => {
  it("keeps the page out of search results while letting its links be followed", async () => {
    mockFetchLinksPage.mockResolvedValue(null);
    const metadata = await generateMetadata();
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({ canonical: "https://links.withjosephine.com/" });
  });

  it("uses the built-in title and line when the link preview fields are blank", async () => {
    mockFetchLinksPage.mockResolvedValue(linksPageState({ seo: { metaTitle: " " } }));
    const metadata = await generateMetadata();
    expect(metadata.title).toBe(LINKS_PAGE_DEFAULTS.metaTitle);
    expect(metadata.description).toBe(LINKS_PAGE_DEFAULTS.metaDescription);
  });

  it("uses the page's own preview picture, and the site default card when none is set", async () => {
    mockFetchLinksPage.mockResolvedValue(
      linksPageState({ seo: { ogImage: { asset: { url: "https://cdn.sanity.io/own.jpg" } } } }),
    );
    expect(JSON.stringify((await generateMetadata()).openGraph)).toContain("own.jpg");

    mockFetchLinksPage.mockResolvedValue(linksPageState(null));
    expect(JSON.stringify((await generateMetadata()).openGraph)).toContain("/og-image.png");
  });
});

describe("links page buttons", () => {
  it("sends every button through the tap counter, and email buttons straight to the mail app", async () => {
    mockFetchLinksPage.mockResolvedValue(
      linksPageState({
        showPage: true,
        buttons: [
          { _key: "a", label: "Home", destination: "home" },
          { _key: "b", label: "Email", destination: "email", email: "hello@withjosephine.com" },
        ],
      }),
    );
    const page = (await LinksPage()) as { props: { children: { props: { buttons: { key: string; href: string }[] } }[] } };
    const buttons = page.props.children[0].props.buttons;
    expect(buttons.map(({ href }) => href)).toEqual(["/tt/go/home", "mailto:hello@withjosephine.com"]);
  });
});

describe("links page switch", () => {
  it.each([
    ["no links page document", null],
    ["the switch never set", linksPageState({ name: "Josephine" })],
    ["the switch off", linksPageState({ showPage: false })],
  ])("sends visitors to the home page with %s", async (_case, state) => {
    mockFetchLinksPage.mockResolvedValue(state);
    await expect(LinksPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("shows the page when the switch is on", async () => {
    mockFetchLinksPage.mockResolvedValue(linksPageState({ showPage: true }));
    await expect(LinksPage()).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
