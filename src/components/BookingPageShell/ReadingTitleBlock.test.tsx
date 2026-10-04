import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReadingPrice, ReadingTitleBlock } from "./ReadingTitleBlock";

const READING = {
  readingTag: "Signature",
  readingName: "Soul Blueprint",
  readingPrice: "$129",
};

describe("ReadingTitleBlock", () => {
  it("renders the reading's tag, name and price", () => {
    render(<ReadingTitleBlock {...READING} />);
    expect(screen.getByText("Signature")).toBeInTheDocument();
    expect(screen.getByText("Soul Blueprint")).toBeInTheDocument();
    expect(screen.getByText("$129")).toBeInTheDocument();
  });

  it("marks the reading name up as the only h1", () => {
    render(<ReadingTitleBlock {...READING} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Soul Blueprint");
  });

  it("makes the reading block a label, not a link", () => {
    render(<ReadingTitleBlock {...READING} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("omits the tag and price lines when they are empty", () => {
    render(<ReadingTitleBlock readingTag="" readingName="Soul Blueprint" readingPrice="" />);
    expect(screen.getByText("Soul Blueprint")).toBeInTheDocument();
    expect(screen.queryByText("Signature")).toBeNull();
    expect(screen.queryByText("$129")).toBeNull();
  });

  it("sets a gift price in the smaller gift size", () => {
    render(<ReadingPrice label="A gift, already paid" tone="gift" />);
    expect(screen.getByText("A gift, already paid").className).toContain("text-[0.95rem]");
  });
});
