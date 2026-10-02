import { describe, expect, it } from "vitest";

import { NOTES_DEFAULTS } from "@/data/defaults";
import type { SanityNotesState } from "@/lib/sanity/types";

import {
  faqNoteLink,
  formatMonthYear,
  isNotesVisible,
  isParagraph,
  noteDescription,
  notesContent,
  notesFooterLink,
  openingText,
  readingMinutes,
  truncateAtWord,
} from "./notes";
import type { NoteBodyBlock } from "./types";

function state(enabled: boolean | undefined, publishedCount: number): SanityNotesState {
  return { settings: enabled === undefined ? null : { enabled }, publishedCount };
}

function paragraph(text: string, style = "normal"): NoteBodyBlock {
  return {
    _type: "block",
    _key: text.slice(0, 8),
    style,
    markDefs: [],
    children: [{ _type: "span", _key: "s", text, marks: [] }],
  };
}

describe("isNotesVisible", () => {
  it.each([
    [true, 1, true],
    [true, 0, false],
    [false, 3, false],
    [undefined, 3, false],
  ])("switch %s with %i published notes is visible: %s", (enabled, count, expected) => {
    expect(isNotesVisible(state(enabled, count))).toBe(expected);
  });

  it("is hidden when the state could not be fetched", () => {
    expect(isNotesVisible(null)).toBe(false);
  });
});

describe("notesContent", () => {
  it("falls back to the defaults for missing and blank strings", () => {
    const content = notesContent({
      settings: { enabled: true, indexTitle: "Writing", signOff: "   " },
      publishedCount: 1,
    });
    expect(content.indexTitle).toBe("Writing");
    expect(content.signOff).toBe(NOTES_DEFAULTS.signOff);
    expect(content.backLabel).toBe(NOTES_DEFAULTS.backLabel);
  });
});

describe("Notes links", () => {
  const note = { title: "Reading your birth chart without your birth time", slug: "birth-time" };

  it("gives the footer and FAQ links only while Notes is visible", () => {
    expect(notesFooterLink(state(false, 2))).toBeUndefined();
    expect(faqNoteLink(state(true, 0), note)).toBeUndefined();
    expect(notesFooterLink(state(true, 2))).toEqual({ label: "Notes", href: "/notes" });
    expect(faqNoteLink(state(true, 2), note)).toEqual({
      label: `Read the note: ${note.title}`,
      href: "/notes/birth-time",
      slug: "birth-time",
    });
  });

  it("skips an FAQ link whose note has no slug", () => {
    expect(faqNoteLink(state(true, 2), { title: "Draft", slug: "" })).toBeUndefined();
    expect(faqNoteLink(state(true, 2), null)).toBeUndefined();
  });
});

describe("readingMinutes", () => {
  it("rounds the word count at 200 a minute with a floor of one", () => {
    expect(readingMinutes(undefined)).toBe(1);
    expect(readingMinutes(40)).toBe(1);
    expect(readingMinutes(1200)).toBe(6);
  });
});

describe("noteDescription", () => {
  it("uses the search description when set", () => {
    expect(
      noteDescription({
        searchDescription: " Custom. ",
        subtitle: "Sub.",
        body: [paragraph("Opening.")],
      }),
    ).toBe("Custom.");
  });

  it("uses the opening paragraph otherwise", () => {
    expect(noteDescription({ subtitle: "Sub.", body: [paragraph("Your chart is the map.")] })).toBe(
      "Your chart is the map.",
    );
  });

  it("falls back to the subtitle when the body does not start with a paragraph", () => {
    expect(openingText([paragraph("A heading", "h2"), paragraph("Then text.")])).toBe("");
    expect(
      noteDescription({ subtitle: "Here is what changes.", body: [paragraph("A heading", "h2")] }),
    ).toBe("Here is what changes.");
  });

  it("does not treat a bullet list as the opening paragraph", () => {
    expect(
      isParagraph({ ...paragraph("A bullet"), listItem: "bullet", level: 1 } as NoteBodyBlock),
    ).toBe(false);
    expect(isParagraph(paragraph("A paragraph"))).toBe(true);
  });

  it("cuts long text at a word and adds an ellipsis", () => {
    const cut = truncateAtWord(`${"word ".repeat(50)}end`, 30);
    expect(cut.length).toBeLessThanOrEqual(30);
    expect(cut).toMatch(/word…$/);
  });
});

describe("formatMonthYear", () => {
  it("prints the UTC month and year in UK English", () => {
    expect(formatMonthYear("2026-10-31T23:30:00Z")).toBe("October 2026");
  });
});
