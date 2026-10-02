import { describe, expect, it } from "vitest";

import { ABOUT_DEFAULTS, NOTES_DEFAULTS } from "@/data/defaults";
import type { SanityArticle, SanityNotesState } from "@/lib/sanity/types";

import { deriveNoteViewProps } from "./deriveNoteViewProps";
import { NOTE_SUMMARIES, PILLAR_ARTICLE, VISIBLE_NOTES_STATE } from "./noteFixtures";

function derive(
  article: Partial<SanityArticle> = {},
  notesState: SanityNotesState = VISIBLE_NOTES_STATE,
) {
  return deriveNoteViewProps({
    article: { ...PILLAR_ARTICLE, ...article },
    notesState,
    siteSettings: null,
  });
}

describe("deriveNoteViewProps", () => {
  it("builds the reading box from the reading and the shared Notes words", () => {
    expect(derive().ending).toEqual({
      leadIn: NOTES_DEFAULTS.cardLeadIn,
      readingName: "Soul Blueprint",
      readingSlug: "soul-blueprint",
      price: "$129",
      line: "The most complete picture of your soul I can give you",
      button: NOTES_DEFAULTS.cardButton,
      href: "/book/soul-blueprint",
    });
  });

  it("takes the box words from Notes Settings", () => {
    const ending = derive(
      {},
      {
        ...VISIBLE_NOTES_STATE,
        settings: { enabled: true, cardLeadIn: "Ready?", cardButton: "Book it" },
      },
    ).ending;
    expect(ending).toMatchObject({ leadIn: "Ready?", button: "Book it" });
  });

  it("drops the reading box when the reading is missing", () => {
    expect(derive({ relatedReading: null }).ending).toBeUndefined();
  });

  it("lists picked notes, never itself or an unpublished pick", () => {
    const { moreNotes } = derive({
      moreNotes: [null, { title: "Self", slug: PILLAR_ARTICLE.slug }, NOTE_SUMMARIES[1]],
    });
    expect(moreNotes.notes.map((note) => note.href)).toEqual(["/notes/what-to-ask"]);
  });

  it("shows See all notes only when more notes exist than the ones listed", () => {
    expect(derive().moreNotes.seeAll).toBeUndefined();
    expect(derive({ moreNotes: [NOTE_SUMMARIES[1]] }).moreNotes.seeAll).toBe(
      NOTES_DEFAULTS.seeAllLabel,
    );
  });

  it("shows the listen row only for a note with a recording", () => {
    expect(derive().listen).toBeUndefined();
    expect(
      derive({ audioUrl: "https://cdn.sanity.io/files/x.mp3", audioMinutes: 6 }).listen,
    ).toEqual({
      src: "https://cdn.sanity.io/files/x.mp3",
      label: NOTES_DEFAULTS.listenLabel,
      length: "6 min",
    });
  });

  it("uses the About portrait unless a photo is resolved, and sizes Sanity photos", () => {
    expect(derive().author.photoUrl).toBe(ABOUT_DEFAULTS.imageUrl);
    const withPhoto = derive(
      {},
      {
        ...VISIBLE_NOTES_STATE,
        settings: { enabled: true, authorPhotoUrl: "https://cdn.sanity.io/images/p/d/me.jpg" },
      },
    );
    expect(withPhoto.author.photoUrl).toBe(
      "https://cdn.sanity.io/images/p/d/me.jpg?w=80&auto=format",
    );
  });

  it("dates the updated line from updatedAt, falling back to publishedAt", () => {
    expect(derive().updated).toBe("Updated October 2026");
    expect(derive({ updatedAt: "2026-12-02T10:00:00Z" }).updated).toBe("Updated December 2026");
  });

  it("adds the footer link while Notes is visible", () => {
    expect(derive().footer.notesLink).toEqual({ label: "Notes", href: "/notes" });
  });
});

describe("deriveNoteViewProps for a draft without a date", () => {
  it("leaves out the updated line instead of failing", () => {
    const draft = { ...PILLAR_ARTICLE, publishedAt: undefined } as unknown as SanityArticle;
    expect(
      deriveNoteViewProps({ article: draft, notesState: VISIBLE_NOTES_STATE, siteSettings: null })
        .updated,
    ).toBeUndefined();
  });
});
