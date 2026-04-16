import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UnderConstruction } from "./UnderConstruction";

describe("UnderConstruction", () => {
  it("renders the brand name", () => {
    render(<UnderConstruction />);
    expect(screen.getByText("Josephine")).toBeInTheDocument();
  });

  it("displays a coming soon message", () => {
    render(<UnderConstruction />);
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it("includes the contact email", () => {
    render(<UnderConstruction />);
    expect(screen.getByRole("link", { name: /hello@withjosephine\.com/i })).toHaveAttribute(
      "href",
      "mailto:hello@withjosephine.com",
    );
  });
});
