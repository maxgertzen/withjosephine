import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MultiSelectExact } from "./MultiSelectExact";

const OPTIONS = [
  { value: "purpose", label: "Soul Purpose" },
  { value: "karma", label: "Karmic Patterns" },
  { value: "love", label: "Relationships" },
  { value: "career", label: "Career" },
];

function setup(value: string[] = []) {
  const onChange = vi.fn();
  render(
    <MultiSelectExact
      id="focus"
      name="focus"
      label="Focus areas"
      value={value}
      onChange={onChange}
      options={OPTIONS}
      count={3}
    />,
  );
  return { onChange };
}

describe("MultiSelectExact", () => {
  it("adds an option when clicked under the limit", async () => {
    const user = userEvent.setup();
    const { onChange } = setup([]);
    await user.click(screen.getByLabelText("Soul Purpose"));
    expect(onChange).toHaveBeenCalledWith(["purpose"]);
  });

  it("removes an option when an already-selected option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["purpose"]);
    await user.click(screen.getByLabelText("Soul Purpose"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disables remaining options once the exact count is reached", () => {
    setup(["purpose", "karma", "love"]);
    expect(screen.getByLabelText("Career")).toBeDisabled();
    expect(screen.getByLabelText("Soul Purpose")).not.toBeDisabled();
  });

  it("does not call onChange when a disabled option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["purpose", "karma", "love"]);
    await user.click(screen.getByLabelText("Career"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
