import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";

describe("Footer", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<Footer />);

    expect(screen.getByText(/Josephine\. All rights reserved\./)).toBeInTheDocument();
    expect(screen.getByAltText("Josephine")).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      brandName: "Custom Brand",
      logoUrl: "/images/custom-logo.png",
      copyrightText: "Custom Brand Inc.",
    };

    render(<Footer content={content} />);

    expect(screen.getByText(/Custom Brand Inc\./)).toBeInTheDocument();
    expect(screen.getByAltText("Custom Brand")).toBeInTheDocument();
  });

  it("hides logo when logoUrl is not provided", () => {
    const content = {
      brandName: "No Logo Brand",
      copyrightText: "No Logo Brand.",
    };

    render(<Footer content={content} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/No Logo Brand\./)).toBeInTheDocument();
  });

  it("includes current year in copyright", () => {
    render(<Footer />);

    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });
});
