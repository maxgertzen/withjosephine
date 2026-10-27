import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { readingBlockParts } from "./ReadingBlock";
import { SOUL_BLUEPRINT_BLOCK, SOUL_BLUEPRINT_QUESTIONS, SOUL_BLUEPRINT_SECTIONS } from "./readingBlockFixture";
import { ReadingBlockPreview } from "./ReadingBlockPreview";

function renderBlock(block = SOUL_BLUEPRINT_BLOCK, sections = SOUL_BLUEPRINT_SECTIONS) {
  render(<ReadingBlockPreview block={block} sections={sections} />);
  return readingBlockParts(block);
}

const withoutQuestions = SOUL_BLUEPRINT_SECTIONS.filter((section) => section.kind !== "questions");
const howItWorks = SOUL_BLUEPRINT_SECTIONS.find((section) => section.key === "how");

const panelOf = (text: string) => screen.getByText(text).closest("[role=region]");

describe("ReadingBlock elements", () => {
  it("shows the promise, facts, reader and section titles", () => {
    renderBlock();

    expect(screen.getByText(SOUL_BLUEPRINT_BLOCK.lead)).toBeInTheDocument();
    expect(screen.getByText("Voice + PDF")).toBeInTheDocument();
    expect(screen.getByText("Read by Josephine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What.s included/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Questions" })).toBeInTheDocument();
  });

  it("gives an empty part no element", () => {
    const parts = renderBlock({
      ...SOUL_BLUEPRINT_BLOCK,
      facts: [],
      otherReadings: { title: "Not sure this is the one?", readings: [] },
    });

    expect(parts.factsSection).toBeNull();
    expect(parts.otherReadingsSection).toBeNull();
    expect(parts.notesSection).toBeNull();
  });

  it("keeps closed accordion text in the page, out of reach until opened", async () => {
    renderBlock();
    const panel = panelOf(SOUL_BLUEPRINT_QUESTIONS[0].answer);
    expect(panel).toHaveAttribute("inert");

    await userEvent.click(screen.getByRole("button", { name: "Questions" }));

    expect(screen.getByRole("button", { name: "Questions" })).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");
  });

  it("lists each How it works line as a checked row", () => {
    const items = howItWorks?.kind === "list" ? howItWorks.items : [];
    renderBlock();

    const rows = panelOf(items[0])!.querySelectorAll("li");
    expect([...rows].map((row) => row.textContent)).toEqual(items);
    expect(rows[0].querySelector("svg")).not.toBeNull();
  });

  it("shows no Questions box when the list has none", () => {
    renderBlock(SOUL_BLUEPRINT_BLOCK, withoutQuestions);

    expect(screen.queryByRole("button", { name: "Questions" })).toBeNull();
  });

  it("links to the other readings", () => {
    renderBlock();

    const nav = screen.getByRole("navigation", { name: "Not sure this is the one?" });
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Birth Chart Reading/ })).toHaveAttribute("href", "/book/birth-chart");
  });
});

describe("ReadingBlock notes list", () => {
  it("lists the reading's notes under their heading", () => {
    renderBlock({
      ...SOUL_BLUEPRINT_BLOCK,
      notes: {
        title: "Notes on this reading",
        items: [{ title: "How the two work together", slug: "together", href: "/notes/together" }],
      },
    });
    const nav = screen.getByRole("navigation", { name: "Notes on this reading" });
    expect(nav.querySelector("a")).toHaveAttribute("href", "/notes/together");
  });

  it("shows no notes list without notes", () => {
    renderBlock();
    expect(screen.queryByRole("navigation", { name: "Notes on this reading" })).not.toBeInTheDocument();
  });
});
