import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DateTimePicker } from "./DateTimePicker";

function setup(overrides: Partial<React.ComponentProps<typeof DateTimePicker>> = {}) {
  const onChange = vi.fn();
  const props = {
    id: "test-dt",
    name: "sendAt",
    label: "Send at",
    value: "",
    onChange,
    ...overrides,
  } satisfies React.ComponentProps<typeof DateTimePicker>;
  render(<DateTimePicker {...props} />);
  return { onChange };
}

describe("DateTimePicker", () => {
  it("splits a full YYYY-MM-DDTHH:mm value into date and time children", () => {
    setup({ value: "2026-06-13T15:30" });
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    const timeInput = screen.getByLabelText(/time/i) as HTMLInputElement;
    expect(dateInput.value).toBe("13/06/2026");
    expect(timeInput.value).toBe("15:30");
  });

  it("renders empty strings to both children when value is empty", () => {
    setup({ value: "" });
    const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
    const timeInput = screen.getByLabelText(/time/i) as HTMLInputElement;
    expect(dateInput.value).toBe("");
    expect(timeInput.value).toBe("");
  });

  it("recombines time change with existing date into YYYY-MM-DDTHH:mm", () => {
    const { onChange } = setup({ value: "2026-06-13T15:30" });
    const timeInput = screen.getByLabelText(/time/i) as HTMLInputElement;
    fireEvent.change(timeInput, { target: { value: "09:45" } });
    fireEvent.blur(timeInput);
    expect(onChange).toHaveBeenLastCalledWith("2026-06-13T09:45");
  });

  it("renders error message once below the fieldset", () => {
    setup({ value: "", error: "Pick a future date" });
    const messages = screen.getAllByText("Pick a future date");
    expect(messages).toHaveLength(1);
  });
});
