import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NavigationButton } from "./NavigationButton";

vi.mock("next/link", async () => {
  const actual = await vi.importActual<typeof import("next/link")>("next/link");
  return {
    ...actual,
    default: ({ children, href }: { children: React.ReactNode; href: string }) => (
      <a href={href}>{children}</a>
    ),
    useLinkStatus: () => ({ pending: false }),
  };
});

describe("NavigationButton", () => {
  it("renders the children inside a link with the given href", () => {
    render(<NavigationButton href="/book/soul-blueprint">Book this Reading</NavigationButton>);
    const link = screen.getByRole("link", { name: /Book this Reading/ });
    expect(link).toHaveAttribute("href", "/book/soul-blueprint");
  });

  it("does not render the spinner while not pending", () => {
    const { container } = render(
      <NavigationButton href="/book/soul-blueprint">Book this Reading</NavigationButton>,
    );
    expect(container.querySelector("svg.animate-spin")).toBeNull();
  });
});

describe("NavigationButton with pending state", () => {
  vi.resetModules();

  it("renders the spinner alongside the label when pending", async () => {
    vi.doMock("next/link", async () => {
      const actual = await vi.importActual<typeof import("next/link")>("next/link");
      return {
        ...actual,
        default: ({ children, href }: { children: React.ReactNode; href: string }) => (
          <a href={href}>{children}</a>
        ),
        useLinkStatus: () => ({ pending: true }),
      };
    });
    const { NavigationButton: PendingButton } = await import("./NavigationButton");

    const { container } = render(
      <PendingButton href="/book/soul-blueprint">Book this Reading</PendingButton>,
    );
    expect(screen.getByText(/Book this Reading/)).toBeInTheDocument();
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();

    vi.doUnmock("next/link");
  });
});
