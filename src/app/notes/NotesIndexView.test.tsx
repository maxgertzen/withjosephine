import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NOTES_INDEX_ILLUSTRATION_URL } from "@/data/defaults";
import type { SanityNotesSettings } from "@/lib/sanity/types";

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

  it("shows the subtitle only when Notes Settings fills it in", () => {
    const { container } = render(<NotesIndexView {...indexProps()} />);
    expect(container.querySelector("main h1 + p")).toBeNull();
    render(<NotesIndexView {...indexProps({ enabled: true, indexSubtitle: "From me." })} />);
    expect(screen.getByText("From me.")).toBeInTheDocument();
  });

  const picked = "https://cdn.sanity.io/images/p/d/drawing.svg";
  it.each([
    [undefined, NOTES_INDEX_ILLUSTRATION_URL],
    [picked, `${picked}?w=640&auto=format`],
  ])("closes the list with the drawing from Notes Settings (%s) or the default", (upload, src) => {
    const { container } = render(
      <NotesIndexView {...indexProps({ enabled: true, indexIllustrationUrl: upload })} />,
    );
    expect(container.querySelector("main img")).toHaveAttribute("src", src);
  });

  it("shows the top menu with Notes marked as the current page", () => {
    render(<NotesIndexView {...indexProps()} />);
    const menu = screen.getByRole("navigation", { name: "Primary" });
    expect(within(menu).getByRole("link", { name: "Notes" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

function indexProps(settings: SanityNotesSettings | null = VISIBLE_NOTES_STATE.settings) {
  return deriveNotesIndexViewProps({
    notesState: { ...VISIBLE_NOTES_STATE, settings },
    articles: NOTE_SUMMARIES,
    siteSettings: null,
  });
}
