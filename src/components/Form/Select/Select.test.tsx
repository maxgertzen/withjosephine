import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Select } from "./Select";

const OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
];

describe("Select", () => {
  it("renders all options plus the placeholder", () => {
    render(
      <Select
        id="time"
        name="time"
        label="Best time"
        value=""
        onChange={vi.fn()}
        options={OPTIONS}
      />,
    );
    const dropdown = screen.getByLabelText(/Best time/);
    expect(dropdown).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Morning" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Evening" })).toBeInTheDocument();
  });

  it("emits onChange with the selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        id="time"
        name="time"
        label="Best time"
        value=""
        onChange={onChange}
        options={OPTIONS}
      />,
    );
    await user.selectOptions(screen.getByLabelText(/Best time/), "evening");
    expect(onChange).toHaveBeenCalledWith("evening");
  });
});
