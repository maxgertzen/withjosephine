import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageIndicator } from "./PageIndicator";

describe("PageIndicator", () => {
  it("renders default page-x-of-y text when no override is supplied", () => {
    render(<PageIndicator pageNumber={2} totalPages={4} />);
    expect(screen.getByText(/Page 2 of 4/)).toBeInTheDocument();
  });

  it("appends a tagline when provided", () => {
    render(
      <PageIndicator
        pageNumber={1}
        totalPages={4}
        tagline="about five minutes, all in."
      />,
    );
    expect(screen.getByText(/Page 1 of 4 · about five minutes, all in\./)).toBeInTheDocument();
  });

  it("uses the provided text override verbatim", () => {
    render(
      <PageIndicator
        pageNumber={1}
        totalPages={1}
        text="One short page · about 2 minutes."
      />,
    );
    expect(screen.getByText(/One short page · about 2 minutes\./)).toBeInTheDocument();
  });

  it("falls back to the single-page wording when totalPages is 1", () => {
    render(<PageIndicator pageNumber={1} totalPages={1} />);
    expect(screen.getByText(/One short page/)).toBeInTheDocument();
  });
});
