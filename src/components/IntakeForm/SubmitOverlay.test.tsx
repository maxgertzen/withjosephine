import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SubmitOverlay } from "./SubmitOverlay";

describe("SubmitOverlay", () => {
  it("renders the default copy when no text prop is supplied", () => {
    render(<SubmitOverlay />);
    expect(screen.getByText(/One moment.+taking you to checkout/)).toBeInTheDocument();
  });

  it("renders the text prop verbatim when supplied", () => {
    render(<SubmitOverlay text="Almost there — opening Stripe securely." />);
    expect(
      screen.getByText("Almost there — opening Stripe securely."),
    ).toBeInTheDocument();
  });

  it("declares role=status and aria-live=polite", () => {
    render(<SubmitOverlay />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
  });
});
