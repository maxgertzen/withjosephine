import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("renders a labelled checkbox", () => {
    render(
      <Checkbox id="terms" name="terms" checked={false} onChange={vi.fn()}>
        I agree to the terms
      </Checkbox>,
    );
    expect(screen.getByRole("checkbox", { name: /I agree to the terms/ })).toBeInTheDocument();
  });

  it("emits onChange with the new checked state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Checkbox id="terms" name="terms" checked={false} onChange={onChange}>
        I agree to the terms
      </Checkbox>,
    );
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders error message when provided", () => {
    render(
      <Checkbox id="terms" name="terms" checked={false} onChange={vi.fn()} error="Required">
        I agree
      </Checkbox>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
  });
});
