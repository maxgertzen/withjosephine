import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionHeading } from "./SectionHeading";

describe("SectionHeading", () => {
  it("renders heading as h2 by default", () => {
    render(<SectionHeading heading="readings" />);

    expect(screen.getByRole("heading", { level: 2, name: "readings" })).toBeInTheDocument();
  });

  it("renders heading as h1 when as='h1'", () => {
    render(<SectionHeading heading="readings" as="h1" />);

    expect(screen.getByRole("heading", { level: 1, name: "readings" })).toBeInTheDocument();
  });

  it("renders heading as h3 when as='h3'", () => {
    render(<SectionHeading heading="readings" as="h3" />);

    expect(screen.getByRole("heading", { level: 3, name: "readings" })).toBeInTheDocument();
  });

  it("renders tag when provided", () => {
    render(<SectionHeading heading="readings" tag="✦ Offerings" />);

    expect(screen.getByText("✦ Offerings")).toBeInTheDocument();
  });

  it("renders subheading when provided", () => {
    render(<SectionHeading heading="readings" subheading="Each reading is unique." />);

    expect(screen.getByText("Each reading is unique.")).toBeInTheDocument();
  });
});
