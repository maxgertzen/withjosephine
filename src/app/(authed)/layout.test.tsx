import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import AuthedLayout from "./layout";

function renderLayout() {
  render(AuthedLayout({ children: <div>child</div> }));
}

describe("AuthedLayout top-bar", () => {
  it("renders the wordmark as the sole home affordance", () => {
    renderLayout();

    expect(screen.queryByRole("link", { name: /^Home$/ })).toBeNull();
    const homeLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/");
    expect(homeLinks).toHaveLength(1);
    expect(homeLinks[0]).toHaveAccessibleName(/Josephine/);
  });

  it("renders no account menu or sign-out affordance", () => {
    renderLayout();

    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /your library and account/i }),
    ).toBeNull();
  });

  it("renders its children", () => {
    renderLayout();

    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
