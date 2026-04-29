import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "./DatePicker";

describe("DatePicker", () => {
  it("renders a text input that opens a calendar popover on focus", () => {
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value=""
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText(/Birth date/);
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("emits an ISO date when the user types a valid ISO string", () => {
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

  it("formats an existing ISO value as a human-readable date for display", () => {
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value="1990-04-12"
        onChange={vi.fn()}
      />,
    );
    const input = screen.getByLabelText(/Birth date/) as HTMLInputElement;
    expect(input.value).toMatch(/12 Apr 1990/);
  });

  it("renders a soft under-age warning when the value is below minAge", () => {
    const todayYear = new Date().getFullYear();
    const tenYearsAgo = `${todayYear - 10}-01-15`;
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value={tenYearsAgo}
        onChange={vi.fn()}
        minAge={18}
      />,
    );
    expect(screen.getByTestId("dob-age-warning")).toHaveTextContent(/under 18/);
  });

  it("does not render the warning when the value is at or over the threshold", () => {
    const todayYear = new Date().getFullYear();
    const thirtyYearsAgo = `${todayYear - 30}-01-15`;
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value={thirtyYearsAgo}
        onChange={vi.fn()}
        minAge={18}
      />,
    );
    expect(screen.queryByTestId("dob-age-warning")).toBeNull();
  });

  it("does not render the warning when the value is empty", () => {
    render(
      <DatePicker
        id="birthDate"
        name="birthDate"
        label="Birth date"
        value=""
        onChange={vi.fn()}
        minAge={18}
      />,
    );
    expect(screen.queryByTestId("dob-age-warning")).toBeNull();
  });
});
