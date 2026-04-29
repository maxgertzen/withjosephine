import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SanityFormFieldOption } from "@/lib/sanity/types";

import { SlotBlock } from "./SlotBlock";

const ONE: SanityFormFieldOption = {
  value: "soul_purpose",
  label: "What is my soul purpose in this lifetime?",
  category: "Soul Purpose",
};

const TWO: SanityFormFieldOption = {
  value: "rel_contract",
  label: "What is the nature of my soul contract?",
  category: "Relationships",
};

describe("SlotBlock", () => {
  it("renders three numbered slots even when nothing is selected", () => {
    render(<SlotBlock count={3} selected={[]} status="Choose three to begin." />);
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("3.")).toBeInTheDocument();
  });

  it("renders the status line passed in via prop", () => {
    render(<SlotBlock count={3} selected={[]} status="Choose three to begin." />);
    expect(screen.getByRole("status")).toHaveTextContent("Choose three to begin.");
  });

  it("fills slots with selected option labels and categories", () => {
    render(<SlotBlock count={3} selected={[ONE, TWO]} status="Two chosen — one to go." />);
    expect(screen.getByText(/soul purpose in this lifetime/)).toBeInTheDocument();
    expect(screen.getByText("Soul Purpose")).toBeInTheDocument();
    expect(screen.getByText("Relationships")).toBeInTheDocument();
  });

  it("renders the limit message when provided", () => {
    render(
      <SlotBlock
        count={3}
        selected={[ONE, TWO, { value: "x", label: "Third", category: "Other" }]}
        status="Three chosen."
        limitMessage="Three is the limit — release one to choose another."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Three is the limit/);
  });

  it("omits the limit message when not at the cap", () => {
    render(<SlotBlock count={3} selected={[ONE]} status="One chosen — two to go." />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
