import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GiftNoteCard } from "./GiftNoteCard";

describe("GiftNoteCard", () => {
  it("renders a note containing {code} as typed", () => {
    render(
      <GiftNoteCard
        label="A note from Dana"
        note="Your code is {code}, love."
        foot="This reading is already paid for."
      />,
    );
    expect(screen.getByText("Your code is {code}, love.")).toBeInTheDocument();
  });

  it("masks the note for Clarity", () => {
    render(<GiftNoteCard label="A note from Dana" note="Happy birthday" foot="Foot" />);
    expect(screen.getByText("Happy birthday")).toHaveAttribute("data-clarity-mask", "True");
  });

  it("renders only the label and foot when there is no note", () => {
    const { container } = render(
      <GiftNoteCard label="A reading, given" note={null} foot="It's already paid for." />,
    );
    expect(screen.getByText("A reading, given")).toBeInTheDocument();
    expect(screen.getByText("It's already paid for.")).toBeInTheDocument();
    expect(container.firstElementChild?.children).toHaveLength(2);
  });
});
