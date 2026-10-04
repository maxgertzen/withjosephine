import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { DisclosureButton } from "./DisclosureButton";

function renderButton(props: { icon?: ReactNode; className?: string } = {}) {
  render(
    <DisclosureButton id="row" controls="panel" open={false} onToggle={() => undefined} {...props}>
      Giving or redeeming a gift
    </DisclosureButton>,
  );
  return screen.getByRole("button", { name: "Giving or redeeming a gift" });
}

describe("DisclosureButton", () => {
  it("renders the icon before the label", () => {
    const button = renderButton({ icon: <svg data-testid="row-icon" /> });

    const icon = screen.getByTestId("row-icon");
    const label = screen.getByText("Giving or redeeming a gift");
    expect(button).toContainElement(icon);
    expect(icon.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lets a caller padding override the base padding", () => {
    const button = renderButton({ className: "px-[18px] py-3.5" });

    expect(button).toHaveClass("px-[18px]", "py-3.5");
    expect(button).not.toHaveClass("px-6");
    expect(button).not.toHaveClass("py-5");
  });

  it("keeps the base padding without a caller override", () => {
    expect(renderButton()).toHaveClass("px-6", "py-5");
  });
});
