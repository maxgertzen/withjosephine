import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Textarea } from "./Textarea";

function renderTextarea(overrides: Partial<Parameters<typeof Textarea>[0]> = {}) {
  const onChange = vi.fn();
  render(
    <Textarea
      id="message"
      name="message"
      label="Message"
      value=""
      onChange={onChange}
      {...overrides}
    />,
  );
  return { onChange };
}

describe("Textarea", () => {
  it("renders a labelled textarea", () => {
    renderTextarea();
    expect(screen.getByLabelText(/Message/).tagName).toBe("TEXTAREA");
  });

  it("emits onChange with the typed value", async () => {
    const user = userEvent.setup();
    const { onChange } = renderTextarea();
    await user.type(screen.getByLabelText(/Message/), "hi");
    expect(onChange).toHaveBeenLastCalledWith("i");
  });

  it("respects rows prop", () => {
    renderTextarea({ rows: 8 });
    expect(screen.getByLabelText(/Message/)).toHaveAttribute("rows", "8");
  });

  it("renders error message", () => {
    renderTextarea({ error: "Too short" });
    expect(screen.getByRole("alert")).toHaveTextContent("Too short");
  });
});
