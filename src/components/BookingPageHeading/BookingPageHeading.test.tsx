import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingPageHeading } from "./BookingPageHeading";

describe("BookingPageHeading", () => {
  it("renders the title as an h2", () => {
    render(<BookingPageHeading title="A few things, before we begin." />);
    expect(
      screen.getByRole("heading", { level: 2, name: "A few things, before we begin." }),
    ).toBeInTheDocument();
  });
});
