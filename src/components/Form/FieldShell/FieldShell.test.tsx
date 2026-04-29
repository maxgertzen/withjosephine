import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FieldShell } from "./FieldShell";

describe("FieldShell", () => {
  it("renders helper text after the input by default", () => {
    const { container } = render(
      <FieldShell id="x" label="Field" helpText="Help me">
        <input id="x" data-testid="x" />
      </FieldShell>,
    );

    const inputEl = screen.getByTestId("x");
    const helper = screen.getByText("Help me");
    const all = Array.from(container.querySelectorAll("[data-field-shell] > *"));
    expect(all.indexOf(inputEl)).toBeLessThan(all.indexOf(helper));
  });

  it("renders helper text before the input when helperPosition is 'before'", () => {
    const { container } = render(
      <FieldShell id="x" label="Field" helpText="Help me" helperPosition="before">
        <input id="x" data-testid="x" />
      </FieldShell>,
    );

    const inputEl = screen.getByTestId("x");
    const helper = screen.getByText("Help me");
    const all = Array.from(container.querySelectorAll("[data-field-shell] > *"));
    expect(all.indexOf(helper)).toBeLessThan(all.indexOf(inputEl));
  });

  it("renders the clarification note above the input when provided", () => {
    render(
      <FieldShell
        id="x"
        label="Field"
        clarificationNote="✦ Akashic Records help locate you"
      >
        <input id="x" />
      </FieldShell>,
    );
    expect(screen.getByText(/Akashic Records help locate you/)).toBeInTheDocument();
  });

  it("renders error text in an alert role", () => {
    render(
      <FieldShell id="x" label="Field" error="Required">
        <input id="x" />
      </FieldShell>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });
});
