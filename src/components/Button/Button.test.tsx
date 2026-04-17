import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

describe("Button", () => {
  it("renders as a button element when no href is provided", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("renders as a link for internal href", () => {
    render(<Button href="/readings">Readings</Button>);

    const link = screen.getByRole("link", { name: "Readings" });
    expect(link).toHaveAttribute("href", "/readings");
  });

  it("renders as a plain anchor for external href", () => {
    render(<Button href="https://stripe.com/pay">Pay</Button>);

    const link = screen.getByRole("link", { name: "Pay" });
    expect(link).toHaveAttribute("href", "https://stripe.com/pay");
  });

  it("applies primary variant styles by default", () => {
    render(<Button>Primary</Button>);

    const button = screen.getByRole("button", { name: "Primary" });
    expect(button.className).toContain("bg-j-bg-interactive");
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole("button", { name: "Ghost" });
    expect(button.className).toContain("bg-transparent");
  });

  it("applies size styles", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button", { name: "Small" }).className).toContain("px-4");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button", { name: "Large" }).className).toContain("px-8");
  });

  it("passes disabled attribute", () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("calls onClick handler", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole("button", { name: "Click" }));

    expect(handleClick).toHaveBeenCalledOnce();
  });
});
