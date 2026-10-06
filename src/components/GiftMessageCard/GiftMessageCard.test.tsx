import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GiftMessageCard } from "./GiftMessageCard";

describe("GiftMessageCard", () => {
  it("renders the heading, body and action", () => {
    render(
      <GiftMessageCard
        heading="This gift was already opened"
        body="Write to hello@withjosephine.com and Josephine will help."
        action={<button type="button">Book the Birth Chart Reading yourself</button>}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "This gift was already opened" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Write to hello@withjosephine.com and Josephine will help."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Book the Birth Chart Reading yourself" }),
    ).toBeInTheDocument();
  });

  it("renders no button without an action", () => {
    render(<GiftMessageCard heading="Sent twice already" body="Josephine will sort it out." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
