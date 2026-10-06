import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchNotesStatePublished: vi.fn(),
  fetchArticlesPublished: vi.fn(),
  fetchArticleDatesPublished: vi.fn(),
  fetchArticlePublished: vi.fn(),
  fetchArticleSlugs: vi.fn(),
  fetchLandingPagePublished: vi.fn(),
  fetchSiteSettingsPublished: vi.fn(),
}));

vi.mock("@/lib/sanity/readingStaticParams", () => ({
  generateReadingStaticParams: vi.fn(async () => [{ readingId: "soul-blueprint" }]),
}));

vi.mock("@/lib/env", () => ({ siteOrigin: () => "https://withjosephine.com" }));

import {
  fetchArticleDatesPublished,
  fetchArticlePublished,
  fetchArticlesPublished,
  fetchNotesStatePublished,
} from "@/lib/sanity/fetch";
import type { SanityNotesState } from "@/lib/sanity/types";

import sitemap from "../sitemap";
import { NOTE_SUMMARIES, PILLAR_ARTICLE, VISIBLE_NOTES_STATE } from "./[slug]/noteFixtures";
import NotePage from "./[slug]/page";
import NotesIndexPage from "./page";

const HIDDEN_STATES: [string, SanityNotesState | null][] = [
  ["switch off", { settings: { enabled: false }, publishedCount: 3 }],
  ["no published note", { settings: { enabled: true }, publishedCount: 0 }],
  ["no settings document", { settings: null, publishedCount: 3 }],
];

const notePageParams = { params: Promise.resolve({ slug: PILLAR_ARTICLE.slug }) };

beforeEach(() => {
  vi.mocked(fetchArticlesPublished).mockResolvedValue(NOTE_SUMMARIES);
  vi.mocked(fetchArticleDatesPublished).mockResolvedValue(NOTE_SUMMARIES);
  vi.mocked(fetchArticlePublished).mockResolvedValue(PILLAR_ARTICLE);
});

describe.each(HIDDEN_STATES)("Notes hidden (%s)", (_, notesState) => {
  beforeEach(() => {
    vi.mocked(fetchNotesStatePublished).mockResolvedValue(notesState);
  });

  it("returns 404 for /notes and for a note", async () => {
    await expect(NotesIndexPage()).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(NotePage(notePageParams)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("keeps Notes out of the sitemap", async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/notes"))).toBe(false);
  });
});

describe("Notes visible", () => {
  beforeEach(() => {
    vi.mocked(fetchNotesStatePublished).mockResolvedValue(VISIBLE_NOTES_STATE);
  });

  it("renders /notes and the note", async () => {
    await expect(NotesIndexPage()).resolves.toBeTruthy();
    await expect(NotePage(notePageParams)).resolves.toBeTruthy();
  });

  it("returns 404 for a note that does not exist", async () => {
    vi.mocked(fetchArticlePublished).mockResolvedValue(null);
    await expect(NotePage(notePageParams)).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lists /notes and every note in the sitemap with lastModified", async () => {
    const entries = await sitemap();
    const notes = entries.filter((entry) => entry.url.includes("/notes"));
    expect(notes).toEqual([
      { url: "https://withjosephine.com/notes", lastModified: "2026-10-01T09:00:00Z" },
      ...NOTE_SUMMARIES.map((note) => ({
        url: `https://withjosephine.com/notes/${note.slug}`,
        lastModified: note.publishedAt,
      })),
    ]);
  });
});
