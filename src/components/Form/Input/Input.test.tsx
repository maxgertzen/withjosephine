import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "./Input";

function renderInput(overrides: Partial<Parameters<typeof Input>[0]> = {}) {
  const onChange = vi.fn();
  const props = {
    id: "fullName",
    name: "fullName",
    label: "Full name",
    value: "",
    onChange,
    ...overrides,
  };
  render(<Input {...props} />);
  return { onChange };
}

describe("Input", () => {
  it("renders a labelled text input by default", () => {
    renderInput();
    const input = screen.getByLabelText(/Full name/);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders an email input when type=email", () => {
    renderInput({ type: "email", label: "Email" });
    expect(screen.getByLabelText(/Email/)).toHaveAttribute("type", "email");
  });

  it("emits onChange with the typed value", async () => {
    const user = userEvent.setup();
    const { onChange } = renderInput();
    await user.type(screen.getByLabelText(/Full name/), "Ada");
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenLastCalledWith("a");
  });

  it("renders helpText when provided", () => {
    renderInput({ helpText: "As shown on your ID" });
    expect(screen.getByText("As shown on your ID")).toBeInTheDocument();
  });

  it("renders error and marks input invalid", () => {
    renderInput({ error: "Required" });
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute("aria-invalid", "true");
  });

  it("marks required with asterisk", () => {
    renderInput({ required: true });
    expect(screen.getByLabelText(/Full name/)).toBeRequired();
  });
});
