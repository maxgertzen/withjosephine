import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<HowItWorks />);

    expect(screen.getByText("how it works")).toBeInTheDocument();
    expect(screen.getByText("Choose Your Reading")).toBeInTheDocument();
    expect(screen.getByText("Share Your Details")).toBeInTheDocument();
    expect(screen.getByText("Receive Your Reading")).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      sectionTag: "✦ Custom Tag",
      heading: "custom heading",
      steps: [
        { title: "Step One", description: "First step description" },
        { title: "Step Two", description: "Second step description" },
      ],
    };

    render(<HowItWorks content={content} />);

    expect(screen.getByText("custom heading")).toBeInTheDocument();
    expect(screen.getByText("Step One")).toBeInTheDocument();
    expect(screen.getByText("First step description")).toBeInTheDocument();
    expect(screen.getByText("Step Two")).toBeInTheDocument();
    expect(screen.queryByText("Choose Your Reading")).not.toBeInTheDocument();
  });

  it("renders step numbers with zero-padded format", () => {
    render(<HowItWorks />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });
});
