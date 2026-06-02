import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Cormorant_Garamond: () => ({ variable: "__test-display-font" }),
  Inter: () => ({ variable: "__test-body-font" }),
}));

import { bodyFont, displayFont } from "@/lib/fonts.generated";

import { StyleProvider, styleProviderClassName } from "./StyleProvider";

describe("StyleProvider", () => {
  it("renders children", () => {
    render(
      <StyleProvider>
        <span data-testid="child">hello</span>
      </StyleProvider>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("hello");
  });

  it("applies both font CSS variable classNames", () => {
    const { container } = render(
      <StyleProvider>
        <span />
      </StyleProvider>
    );
    const root = container.firstElementChild;
    expect(root).not.toBeNull();
    expect(root?.className).toContain(displayFont.variable);
    expect(root?.className).toContain(bodyFont.variable);
  });

  it("exports the same className the component applies", () => {
    expect(styleProviderClassName).toContain(displayFont.variable);
    expect(styleProviderClassName).toContain(bodyFont.variable);
  });
});
