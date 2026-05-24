import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Loader } from "./Loader";

describe("Loader", () => {
  it("renders with default label", () => {
    render(<Loader />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
  });

  it("accepts a custom label", () => {
    render(<Loader label="Preparing your chart" />);

    expect(screen.getByRole("status")).toHaveAccessibleName("Preparing your chart");
  });

  it("applies medium size by default", () => {
    render(<Loader />);

    expect(screen.getByRole("status")).toHaveStyle({ "--jl-size": "56px" });
  });

  it("maps preset sizes to pixel values", () => {
    const { rerender } = render(<Loader size="sm" />);
    expect(screen.getByRole("status")).toHaveStyle({ "--jl-size": "32px" });

    rerender(<Loader size="lg" />);
    expect(screen.getByRole("status")).toHaveStyle({ "--jl-size": "96px" });

    rerender(<Loader size="xl" />);
    expect(screen.getByRole("status")).toHaveStyle({ "--jl-size": "144px" });
  });

  it("accepts a numeric size", () => {
    render(<Loader size={20} />);

    expect(screen.getByRole("status")).toHaveStyle({ "--jl-size": "20px" });
  });

  it("merges custom className", () => {
    render(<Loader className="ml-2" />);

    expect(screen.getByRole("status").className).toContain("ml-2");
  });

  it("hides itself from assistive tech when decorative=true (no role=status, aria-hidden=true)", () => {
    const { container } = render(<Loader decorative />);

    expect(screen.queryByRole("status")).toBeNull();
    const node = container.querySelector("[aria-hidden='true']");
    expect(node).not.toBeNull();
  });
});
