import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MagicLinkEmailForm } from "./MagicLinkEmailForm";

function setup(overrides: Partial<React.ComponentProps<typeof MagicLinkEmailForm>> = {}) {
  return render(
    <MagicLinkEmailForm
      action="/api/auth/magic-link"
      submitLabel="Send me a link"
      emailLabel="Email"
      {...overrides}
    />,
  );
}

describe("MagicLinkEmailForm", () => {
  it("submit button is disabled until input is a valid email (empty + invalid both blocked)", () => {
    const { getByRole, getByLabelText } = setup();
    const button = getByRole("button", { name: /Send me a link/i }) as HTMLButtonElement;
    const input = getByLabelText(/Email/i) as HTMLInputElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "a" } });
    expect(button.disabled).toBe(true);

    fireEvent.change(input, { target: { value: "ada@example.com" } });
    expect(button.disabled).toBe(false);

    fireEvent.change(input, { target: { value: "" } });
    expect(button.disabled).toBe(true);
  });

  it("shows inline error after blur with invalid input", () => {
    const { getByLabelText, getByRole, queryByRole } = setup();
    const input = getByLabelText(/Email/i) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "not-an-email" } });
    expect(queryByRole("alert")).toBeNull();

    fireEvent.blur(input);
    const alert = getByRole("alert");
    expect(alert.textContent).toContain("valid email");
  });

  it("does NOT show error for empty (un-touched) input", () => {
    const { queryByRole, getByLabelText } = setup();
    fireEvent.blur(getByLabelText(/Email/i));
    expect(queryByRole("alert")).toBeNull();
  });

  it("clears error when user fixes the input to a valid email", () => {
    const { getByLabelText, queryByRole } = setup();
    const input = getByLabelText(/Email/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.blur(input);
    expect(queryByRole("alert")).not.toBeNull();

    fireEvent.change(input, { target: { value: "ada@example.com" } });
    expect(queryByRole("alert")).toBeNull();
  });

  it("renders hidden fields when supplied (for verify form: token + next)", () => {
    const { container } = setup({ hiddenFields: { token: "abc", next: "/listen/sub_1" } });
    const tokenInput = container.querySelector('input[name="token"]') as HTMLInputElement;
    const nextInput = container.querySelector('input[name="next"]') as HTMLInputElement;
    expect(tokenInput.value).toBe("abc");
    expect(nextInput.value).toBe("/listen/sub_1");
  });

  it("posts to the supplied action with method=post", () => {
    const { container } = setup({ action: "/api/auth/magic-link/verify" });
    const form = container.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("/api/auth/magic-link/verify");
    expect(form.getAttribute("method")?.toLowerCase()).toBe("post");
  });
});
