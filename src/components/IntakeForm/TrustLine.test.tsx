import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrustLine } from "./TrustLine";

describe("TrustLine", () => {
  it("renders the text passed via prop", () => {
    render(<TrustLine text="Every reading is read by me, written by me, and made only for you." />);

    expect(
      screen.getByText(/Every reading is read by me, written by me/),
    ).toBeInTheDocument();
  });

  it("merges custom className with base typography classes", () => {
    const { container } = render(<TrustLine text="x" className="custom-class" />);
    const p = container.querySelector("p");

    expect(p?.className).toMatch(/font-display/);
    expect(p?.className).toMatch(/italic/);
    expect(p?.className).toMatch(/custom-class/);
  });
});
