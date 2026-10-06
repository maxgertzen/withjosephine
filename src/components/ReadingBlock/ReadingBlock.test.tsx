import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { BookingEntry } from "@/lib/analytics";
import { BookingEntryContext } from "@/lib/intake/bookingEntryContext";
import { PRE_PAINT_FOLD_ATTRIBUTE } from "@/lib/intake/readingFoldPrePaint";

import { ReadingBlock } from "./ReadingBlock";
import { SOUL_BLUEPRINT_BLOCK } from "./readingBlockFixture";

function renderAs(entry: BookingEntry | null, props = SOUL_BLUEPRINT_BLOCK) {
  render(
    <BookingEntryContext.Provider value={entry}>
      <ReadingBlock {...props} />
    </BookingEntryContext.Provider>,
  );
}

const panelOf = (text: string) => screen.getByText(text).closest("[role=region]");
const blockPanel = () => document.getElementById(`${SOUL_BLUEPRINT_BLOCK.slug}-reading-block`);
const foldRow = () =>
  screen.getByRole("button", { name: SOUL_BLUEPRINT_BLOCK.foldRowLabel, hidden: true });

describe("ReadingBlock, open for a visitor from search", () => {
  it("shows the promise, facts, reader and section titles with no fold row", () => {
    renderAs("external");

    expect(screen.getByText(SOUL_BLUEPRINT_BLOCK.lead)).toBeInTheDocument();
    expect(screen.getByText("Voice + PDF")).toBeInTheDocument();
    expect(screen.getByText("Read by Josephine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What.s included/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "How it works" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Questions" })).toBeInTheDocument();
    expect(foldRow()).toHaveClass("hidden");
    expect(blockPanel()).not.toHaveAttribute("inert");
    expect(blockPanel()).not.toHaveAttribute("role");
  });

  it("renders open before the visit is classified, folding by CSS when the pre-paint script found a draft", () => {
    renderAs(null);

    expect(foldRow()).toHaveClass("hidden", "[body[data-reading-fold]_&]:flex");
    expect(blockPanel()).not.toHaveAttribute("inert");
    expect(blockPanel()).toHaveClass("[body[data-reading-fold]_&]:grid-rows-[0fr]!");
  });

  it("removes the pre-paint fold marker once the visit is classified", () => {
    document.body.setAttribute(PRE_PAINT_FOLD_ATTRIBUTE, "");

    renderAs("draft");

    expect(document.body).not.toHaveAttribute(PRE_PAINT_FOLD_ATTRIBUTE);
    expect(foldRow()).not.toHaveClass("hidden");
  });

  it("keeps closed accordion text in the page, out of reach until opened", async () => {
    renderAs("external");
    const panel = panelOf(SOUL_BLUEPRINT_BLOCK.questions.items[0].answer);
    expect(panel).toHaveAttribute("inert");

    await userEvent.click(screen.getByRole("button", { name: "Questions" }));

    expect(screen.getByRole("button", { name: "Questions" })).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");
  });

  it("lists each How it works paragraph as a checked row", () => {
    const { content } = SOUL_BLUEPRINT_BLOCK.howItWorks;
    renderAs("external");

    const rows = panelOf(content[0].children[0].text)!.querySelectorAll("li");
    expect([...rows].map((row) => row.textContent)).toEqual(
      content.map((paragraph) => paragraph.children[0].text),
    );
    expect(rows[0].querySelector("svg")).not.toBeNull();
  });

  it("hides the Questions section when no questions are picked", () => {
    renderAs("external", { ...SOUL_BLUEPRINT_BLOCK, questions: { title: "Questions", items: [] } });

    expect(screen.queryByRole("button", { name: "Questions" })).toBeNull();
  });

  it("links to the other readings", () => {
    renderAs("external");

    const nav = screen.getByRole("navigation", { name: "Not sure this is the one?" });
    expect(nav.querySelectorAll("a")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Birth Chart Reading/ })).toHaveAttribute("href", "/book/birth-chart");
  });
});

describe.each<BookingEntry>(["homepage_card", "draft"])("ReadingBlock, folded for a %s visitor", (entry) => {
  it("shows one closed row and keeps the block text in the page", () => {
    renderAs(entry);

    expect(screen.getByRole("button", { name: SOUL_BLUEPRINT_BLOCK.foldRowLabel })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(blockPanel()).toHaveAttribute("inert");
  });

  it("opens the block on tap", async () => {
    renderAs(entry);

    await userEvent.click(screen.getByRole("button", { name: SOUL_BLUEPRINT_BLOCK.foldRowLabel }));

    expect(screen.getByRole("button", { name: SOUL_BLUEPRINT_BLOCK.foldRowLabel })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(blockPanel()).not.toHaveAttribute("inert");
  });
});

describe("ReadingBlock notes list", () => {
  it("lists the reading's notes under their heading", () => {
    renderAs("external", {
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
    renderAs("external");
    expect(screen.queryByRole("navigation", { name: "Notes on this reading" })).not.toBeInTheDocument();
  });
});
