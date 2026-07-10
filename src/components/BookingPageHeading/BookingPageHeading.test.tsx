import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingPageHeading } from "./BookingPageHeading";

describe("BookingPageHeading", () => {
  it("renders the eyebrow and title", () => {
    render(<BookingPageHeading eyebrow="✦ Intake" title="Soul Blueprint" />);
    expect(screen.getByText("✦ Intake")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Soul Blueprint" })).toBeInTheDocument();
  });

  it("omits each element when its prop is absent", () => {
    const { container } = render(<BookingPageHeading title="Only title" />);
    expect(container.querySelector("p")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "Only title" })).toBeInTheDocument();
  });
});
