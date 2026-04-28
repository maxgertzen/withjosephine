import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimePicker } from "./TimePicker";

describe("TimePicker", () => {
  it("renders a time input", () => {
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Birth time/)).toHaveAttribute("type", "time");
  });

  it("emits onChange when the time changes", () => {
    const onChange = vi.fn();
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Birth time/), {
      target: { value: "07:30" },
    });
    expect(onChange).toHaveBeenCalledWith("07:30");
  });
});
