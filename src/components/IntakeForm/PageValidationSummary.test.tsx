import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PageValidationSummary } from "./PageValidationSummary";

describe("PageValidationSummary", () => {
  it("renders nothing when errorCount is 0", () => {
    const { container } = render(
      <PageValidationSummary
        errorCount={0}
        firstFieldLabel={null}
        onJumpToFirstError={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the singular noun when exactly one field is invalid", () => {
    render(
      <PageValidationSummary
        errorCount={1}
        firstFieldLabel="Email"
        onJumpToFirstError={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("1 field still needs your attention");
    expect(screen.getByRole("button", { name: "Email" })).toBeInTheDocument();
  });

  it("renders the plural noun and first field label when multiple fields are invalid", () => {
    render(
      <PageValidationSummary
        errorCount={3}
        firstFieldLabel="Date of birth"
        onJumpToFirstError={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "3 fields still need your attention",
    );
    expect(screen.getByRole("button", { name: "Date of birth" })).toBeInTheDocument();
  });

  it("invokes onJumpToFirstError when the field-label button is clicked", async () => {
    const onJumpToFirstError = vi.fn();
    render(
      <PageValidationSummary
        errorCount={1}
        firstFieldLabel="Full name"
        onJumpToFirstError={onJumpToFirstError}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Full name" }));
    expect(onJumpToFirstError).toHaveBeenCalledTimes(1);
  });
});
