import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HowItWorks } from "./HowItWorks";

describe("HowItWorks", () => {
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
