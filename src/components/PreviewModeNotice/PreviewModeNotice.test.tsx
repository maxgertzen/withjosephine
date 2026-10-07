import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const pathname = vi.hoisted(() => ({ value: "/book/birth-chart" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

import { PreviewModeNotice } from "./PreviewModeNotice";

function setCookie(value: string) {
  Object.defineProperty(document, "cookie", { configurable: true, get: () => value });
}

afterEach(() => {
  pathname.value = "/book/birth-chart";
  setCookie("");
  vi.restoreAllMocks();
});

describe("PreviewModeNotice", () => {
  it("offers to leave preview when the flag is set outside Studio", () => {
    setCookie("preview-active=1");
    render(<PreviewModeNotice />);
    expect(screen.getByRole("link", { name: "Leave preview" })).toHaveAttribute(
      "href",
      "/api/draft/disable?redirect=%2Fbook%2Fbirth-chart",
    );
  });

  it("stays hidden without the flag", () => {
    setCookie("consent-required=0");
    render(<PreviewModeNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays hidden on /preview pages", () => {
    setCookie("preview-active=1");
    pathname.value = "/preview/book/birth-chart";
    render(<PreviewModeNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays hidden inside the Studio iframe", () => {
    setCookie("preview-active=1");
    vi.spyOn(window, "top", "get").mockReturnValue({} as Window);
    render(<PreviewModeNotice />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
