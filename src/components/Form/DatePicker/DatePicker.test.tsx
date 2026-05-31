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

  it("emits an ISO date when the user types a complete DD/MM/YYYY string", () => {
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
      target: { value: "12/04/1990" },
    });
    expect(onChange).toHaveBeenCalledWith("1990-04-12");
  });

  it("auto-inserts slashes as the user types digits", () => {
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
    const input = screen.getByLabelText(/Birth date/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12041990" } });
    expect(input.value).toBe("12/04/1990");
    expect(onChange).toHaveBeenCalledWith("1990-04-12");
  });

  it("formats an existing ISO value as DD/MM/YYYY for display", () => {
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
    expect(input.value).toBe("12/04/1990");
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

  describe("Radix Select integration (post 50dqawuf)", () => {
    it("renders Month + Year dropdowns as Radix Select comboboxes when the popover opens", async () => {
      render(
        <DatePicker
          id="birthDate"
          name="birthDate"
          label="Birth date"
          value="1992-04-21"
          onChange={vi.fn()}
        />,
      );
      fireEvent.focus(screen.getByLabelText(/Birth date/));

      // react-day-picker labels its dropdowns Month / Year; the custom
      // adapter forwards those to BrandSelect's ariaLabel.
      expect(await screen.findByRole("combobox", { name: "Month" })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: "Year" })).toBeInTheDocument();
    });
  });
});
