import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BrandSelect } from "./BrandSelect";

const OPTIONS = [
  { value: "01", label: "01" },
  { value: "02", label: "02" },
  { value: "03", label: "03" },
];

describe("BrandSelect", () => {
  it("renders trigger with placeholder when value is empty", () => {
    render(
      <BrandSelect
        ariaLabel="Hour"
        placeholder="HH"
        value=""
        onValueChange={() => {}}
        options={OPTIONS}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Hour" });
    expect(trigger).toHaveTextContent("HH");
  });

  it("renders trigger with current value label when set", () => {
    render(
      <BrandSelect
        ariaLabel="Hour"
        placeholder="HH"
        value="02"
        onValueChange={() => {}}
        options={OPTIONS}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Hour" })).toHaveTextContent("02");
  });

  it("fires onValueChange when an option is picked via keyboard", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <BrandSelect
        ariaLabel="Hour"
        placeholder="HH"
        value=""
        onValueChange={onValueChange}
        options={OPTIONS}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Hour" }));
    // Radix Select renders an aria-label on items via ItemText; pick by text.
    await user.click(await screen.findByText("02"));
    expect(onValueChange).toHaveBeenCalledWith("02");
  });

  it("respects disabled state", () => {
    render(
      <BrandSelect
        ariaLabel="Hour"
        placeholder="HH"
        value=""
        onValueChange={() => {}}
        options={OPTIONS}
        disabled
      />,
    );
    expect(screen.getByRole("combobox", { name: "Hour" })).toBeDisabled();
  });
});
