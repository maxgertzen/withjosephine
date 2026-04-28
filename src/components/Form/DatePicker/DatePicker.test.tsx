import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders a date input", () => {
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/Birth date/)).toHaveAttribute("type", "date");
  });

  it("emits onChange when the date changes", () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value=""
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Birth date/), {
      target: { value: "1990-04-12" },
    });
    expect(onChange).toHaveBeenCalledWith("1990-04-12");
  });
});
