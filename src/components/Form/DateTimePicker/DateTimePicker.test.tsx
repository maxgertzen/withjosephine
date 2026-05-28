import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function getCombinedInput(): HTMLInputElement {
  return screen.getByLabelText(/send at/i) as HTMLInputElement;
}

describe("DateTimePicker", () => {
  it("renders a single combined input (no native datetime-local)", () => {
    const { container } = render(
      <DateTimePicker id="dt" name="sendAt" label="Send at" value="" onChange={() => {}} />,
    );
    expect(container.querySelector("input[type='datetime-local']")).toBeNull();
    expect(getCombinedInput()).toBeInTheDocument();
  });

  it("displays YYYY-MM-DDTHH:mm value formatted as dd/MM/yyyy HH:mm", () => {
    setup({ value: "2026-06-13T15:30" });
    expect(getCombinedInput().value).toBe("13/06/2026 15:30");
  });

  it("renders empty input when value is empty", () => {
    setup({ value: "" });
    expect(getCombinedInput().value).toBe("");
  });

  it("emits combined ISO-local value when user types a complete date+time manually", () => {
    const { onChange } = setup({ value: "" });
    const input = getCombinedInput();
    fireEvent.change(input, { target: { value: "13/06/2026 15:30" } });
    expect(onChange).toHaveBeenCalledWith("2026-06-13T15:30");
  });

  it("emits empty string when user clears the input", () => {
    const { onChange } = setup({ value: "2026-06-13T15:30" });
    const input = getCombinedInput();
    fireEvent.change(input, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("exposes a popover trigger on the input (aria-haspopup=dialog)", () => {
    setup({ value: "" });
    expect(getCombinedInput().getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("mouse: clicking a calendar day commits a value containing the picked date", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker
        id="dt"
        name="sendAt"
        label="Send at"
        value=""
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/send at/i));
    const dayButton = document
      .querySelector('td[data-day]:not([data-outside]) button:not([disabled])') as HTMLButtonElement | null;
    expect(dayButton).toBeTruthy();
    await user.click(dayButton!);
    expect(onChange).toHaveBeenCalled();
    const emitted = onChange.mock.calls.at(-1)?.[0] as string;
    expect(emitted).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("mouse: clicking an hour option commits a value that includes that hour", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker
        id="dt"
        name="sendAt"
        label="Send at"
        value="2026-06-13T"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/send at/i));
    const hour15 = document.getElementById("dt-hour-opt-15");
    expect(hour15).toBeTruthy();
    await user.click(hour15!);
    const emitted = onChange.mock.calls.at(-1)?.[0] as string;
    expect(emitted).toBe("2026-06-13T15:00");
  });

  it("mouse: clicking a minute option commits with both halves", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker
        id="dt"
        name="sendAt"
        label="Send at"
        value="2026-06-13T15:00"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByLabelText(/send at/i));
    const min45 = document.getElementById("dt-minute-opt-45");
    expect(min45).toBeTruthy();
    await user.click(min45!);
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("2026-06-13T15:45");
  });

  it("Done button closes the popover", async () => {
    const user = userEvent.setup();
    setup({ value: "2026-06-13T15:30" });
    await user.click(getCombinedInput());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /done/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Escape on input closes the popover", async () => {
    const user = userEvent.setup();
    setup({ value: "2026-06-13T15:30" });
    const input = getCombinedInput();
    await user.click(input);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Enter on a focused day commits that date (when day isn't already selected)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateTimePicker id="dt" name="sendAt" label="Send at" value="2026-06-13T15:30" onChange={onChange} />,
    );
    await user.click(screen.getByLabelText(/send at/i));
    await user.tab();
    let focused = document.activeElement as HTMLElement;
    const maxSteps = 8;
    for (let i = 0; i < maxSteps && focused?.closest?.("td")?.getAttribute("data-day") !== "2026-06-13"; i++) {
      await user.tab();
      focused = document.activeElement as HTMLElement;
    }
    expect(focused?.closest("td")?.getAttribute("data-day")).toBe("2026-06-13");
    onChange.mockClear();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)?.[0]).toBe("2026-06-14T15:30");
  });

  it("partial state: date-only value renders as dd/MM/yyyy in the input", () => {
    setup({ value: "2026-06-13T" });
    expect(getCombinedInput().value).toBe("13/06/2026");
  });

  it("partial state: time-only value renders as HH:mm in the input", () => {
    setup({ value: "T15:30" });
    expect(getCombinedInput().value).toBe("15:30");
  });

  it("keyboard: Tab from input → popover content → Tab cycles to hour option then minute option", async () => {
    const user = userEvent.setup();
    setup({ value: "2026-06-13T15:30" });
    const input = getCombinedInput();
    await user.click(input);
    expect(input).toHaveFocus();
    // popover should already be open via onFocus; tab into content
    await user.tab();
    let focused = document.activeElement as HTMLElement;
    // first tab into popover content lands on first focusable
    expect(focused).not.toBe(document.body);
    // keep tabbing until we hit an hour option
    const maxSteps = 12;
    for (let i = 0; i < maxSteps && focused?.id?.indexOf("-hour-opt-") === -1; i++) {
      await user.tab();
      focused = document.activeElement as HTMLElement;
    }
    expect(focused?.id).toContain("-hour-opt-15");
    await user.tab();
    focused = document.activeElement as HTMLElement;
    expect(focused?.id).toContain("-minute-opt-30");
  });
});
