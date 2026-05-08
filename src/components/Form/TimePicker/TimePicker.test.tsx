import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimePicker } from "./TimePicker";

describe("TimePicker", () => {
  it("renders a text input that opens a time popover on focus", () => {
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/Birth time/);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("emits onChange when the user types a valid HH:MM", () => {
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

  it("auto-inserts the colon as the user types digits", () => {
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
    const input = screen.getByLabelText(/Birth time/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0730" } });
    expect(input.value).toBe("07:30");
    expect(onChange).toHaveBeenCalledWith("07:30");
  });

  it("strips non-digits as the user types", () => {
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
    const input = screen.getByLabelText(/Birth time/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc07-30xyz" } });
    expect(input.value).toBe("07:30");
  });

  it("renders the unknown toggle when the prop is provided", () => {
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={vi.fn()}
        unknownToggle={{
          label: "I don't know my birth time",
          checked: false,
          onChange: vi.fn(),
        }}
      />,
    );
    expect(screen.getByLabelText(/I don't know my birth time/)).toBeInTheDocument();
  });

  it("disables the time input when the unknown toggle is checked", () => {
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={vi.fn()}
        unknownToggle={{
          label: "I don't know my birth time",
          checked: true,
          onChange: vi.fn(),
        }}
      />,
    );
    expect(screen.getByLabelText(/Birth time/)).toBeDisabled();
  });

  it("treats a value of `unknown` as an unknown state with empty visible input", () => {
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value="unknown"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/Birth time/) as HTMLInputElement;
    expect(input).toBeDisabled();
    expect(input.value).toBe("");
  });

  it("invokes the toggle onChange when the user clicks it", () => {
    const onToggle = vi.fn();
    render(
      <TimePicker
        id="birthTime"
        name="birthTime"
        label="Birth time"
        value=""
        onChange={vi.fn()}
        unknownToggle={{
          label: "I don't know my birth time",
          checked: false,
          onChange: onToggle,
        }}
      />,
    );
    fireEvent.click(screen.getByLabelText(/I don't know my birth time/));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});
