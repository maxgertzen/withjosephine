import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { readingBlockElements } from "./ReadingBlock";
import { SOUL_BLUEPRINT_BLOCK } from "./readingBlockFixture";

function renderBlock(props = SOUL_BLUEPRINT_BLOCK) {
  const elements = readingBlockElements(props);
  render(<>{Object.values(elements)}</>);
  return elements;
}

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

  it("gives an empty section no element", () => {
    const elements = renderBlock({
      ...SOUL_BLUEPRINT_BLOCK,
      facts: [],
      questions: { title: "Questions", items: [] },
      otherReadings: { title: "Not sure this is the one?", readings: [] },
    });

    expect(elements.facts).toBeNull();
    expect(elements.questions).toBeNull();
    expect(elements.otherReadings).toBeNull();
    expect(elements.notes).toBeNull();
  });

  it("keeps closed accordion text in the page, out of reach until opened", async () => {
    renderBlock();
    const panel = panelOf(SOUL_BLUEPRINT_BLOCK.questions.items[0].answer);
    expect(panel).toHaveAttribute("inert");

    await userEvent.click(screen.getByRole("button", { name: "Questions" }));

    expect(screen.getByRole("button", { name: "Questions" })).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");
  });

  it("lists each How it works line as a checked row", () => {
    const { items } = SOUL_BLUEPRINT_BLOCK.howItWorks;
    renderBlock();

    const rows = panelOf(items[0])!.querySelectorAll("li");
    expect([...rows].map((row) => row.textContent)).toEqual(items);
    expect(rows[0].querySelector("svg")).not.toBeNull();
  });

  it("hides the Questions section when no questions are picked", () => {
    renderBlock({ ...SOUL_BLUEPRINT_BLOCK, questions: { title: "Questions", items: [] } });

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
