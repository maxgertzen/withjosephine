import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { deriveNoteViewProps } from "./deriveNoteViewProps";
import { PILLAR_ARTICLE, VISIBLE_NOTES_STATE } from "./noteFixtures";
import { NoteView } from "./NoteView";

const props = deriveNoteViewProps({
  article: PILLAR_ARTICLE,
  notesState: VISIBLE_NOTES_STATE,
  siteSettings: null,
});

describe("NoteView", () => {
  it("renders the top of the note: back link, title, subtitle and author", () => {
    render(<NoteView {...props} />);
    expect(screen.getByRole("link", { name: /‹\s+Notes/ })).toHaveAttribute("href", "/notes");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(PILLAR_ARTICLE.title);
    expect(screen.getByText(PILLAR_ARTICLE.subtitle)).toBeInTheDocument();
    expect(screen.getByText("Written by Josephine")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Listen/ })).not.toBeInTheDocument();
  });

  it("renders the body: heading, Plate, pull quote and tracked links", () => {
    render(<NoteView {...props} />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Why I read them together" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read together")).toBeInTheDocument();
    expect(screen.getByText("Every contract")).toBeInTheDocument();
    expect(screen.getByText(/I bring them back to you/).closest("blockquote")).not.toBeNull();

    const readingLink = screen.getByRole("link", { name: "signature reading" });
    expect(readingLink).toHaveAttribute("href", "/book/soul-blueprint");
    expect(readingLink).toHaveAttribute("data-mp-event", "article_reading_click");

    const noteLink = screen.getByRole("link", {
      name: "what to ask in an Akashic Records reading",
    });
    expect(noteLink).toHaveAttribute("href", "/notes/what-to-ask");
    expect(noteLink).toHaveAttribute("data-mp-event", "article_note_click");
  });

  it("ends with the sign-off, the reading card and two more notes", () => {
    render(<NoteView {...props} />);
    expect(screen.getByText("With love, Josephine")).toBeInTheDocument();
    expect(screen.getByText("Updated October 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See this reading" })).toHaveAttribute(
      "href",
      "/book/soul-blueprint",
    );
    expect(screen.getByText("$129")).toBeInTheDocument();

    const more = screen.getByRole("navigation", { name: "More notes" });
    expect(
      within(more)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/notes/what-to-ask", "/notes/birth-time"]);
  });

  it("puts the Notes link in the footer", () => {
    render(<NoteView {...props} />);
    const footer = screen.getByRole("navigation", { name: "Footer" });
    expect(within(footer).getByRole("link", { name: "Notes" })).toHaveAttribute("href", "/notes");
  });

  it("shows a listen button when the note has a recording", () => {
    render(
      <NoteView
        {...props}
        listen={{ src: "/a.mp3", label: "Listen to this note", length: "6 min" }}
      />,
    );
    expect(screen.getByRole("button", { name: "Listen to this note" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("6 min")).toBeInTheDocument();
  });
});
