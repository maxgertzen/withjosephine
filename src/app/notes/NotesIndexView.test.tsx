import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NOTE_SUMMARIES, VISIBLE_NOTES_STATE } from "./[slug]/noteFixtures";
import { deriveNotesIndexViewProps } from "./deriveNotesIndexViewProps";
import { NotesIndexView } from "./NotesIndexView";

describe("NotesIndexView", () => {
  it("lists every note with its subtitle and reading time, and no dates", () => {
    const props = deriveNotesIndexViewProps({
      notesState: { ...VISIBLE_NOTES_STATE, settings: { enabled: true, indexTitle: "Writing" } },
      articles: NOTE_SUMMARIES,
      siteSettings: null,
    });
    render(<NotesIndexView {...props} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Writing");
    expect(screen.getByText("Answers to the questions people bring to me.")).toBeInTheDocument();
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/notes/"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/notes/astrology-and-the-akashic-records",
      "/notes/what-to-ask",
      "/notes/birth-time",
    ]);
    expect(screen.getByText("6 minute read")).toBeInTheDocument();
    expect(screen.getByRole("list")).not.toHaveTextContent(/2026|September|October/);
  });
});
