import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CharacterCounter } from "./CharacterCounter";

function renderCounter(length: number) {
  render(
    <CharacterCounter
      id="note-counter"
      length={length}
      max={280}
      showFrom={220}
      warnFrom={260}
      template="{remaining} left"
    />,
  );
  return document.getElementById("note-counter");
}

describe("CharacterCounter", () => {
  it("shows no text at 219 characters", () => {
    expect(renderCounter(219)).toBeEmptyDOMElement();
  });

  it("shows the remaining count at 220 characters", () => {
    renderCounter(220);
    expect(screen.getByText("60 left")).toBeInTheDocument();
  });

  it("turns rose at 260 characters", () => {
    expect(renderCounter(260)).toHaveClass("text-j-text-rose");
  });

  it("is not rose at 259 characters", () => {
    expect(renderCounter(259)).not.toHaveClass("text-j-text-rose");
  });

  it("announces changes politely", () => {
    expect(renderCounter(0)).toHaveAttribute("aria-live", "polite");
  });
});
