import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormSelect } from "./FormSelect";

const OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
];

describe("FormSelect", () => {
  it("renders the trigger with the placeholder when value is empty", () => {
    render(
      <FormSelect
        id="time"
        name="time"
        label="Best time"
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
        placeholder="Pick one"
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Best time" });
    expect(trigger).toHaveTextContent("Pick one");
  });

  it("emits onChange with the selected value when an option is picked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormSelect
        id="time"
        name="time"
        label="Best time"
        value=""
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    await user.click(screen.getByRole("combobox", { name: "Best time" }));
    await user.click(await screen.findByText("Evening"));
    expect(onChange).toHaveBeenCalledWith("evening");
  });

  it("includes a hidden input so form submission still carries the name+value", () => {
    const { container } = render(
      <FormSelect
        id="time"
        name="best_time"
        label="Best time"
        value="evening"
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const hidden = container.querySelector('input[type="hidden"]');
    expect(hidden).toHaveAttribute("name", "best_time");
    expect(hidden).toHaveAttribute("value", "evening");
  });
});
