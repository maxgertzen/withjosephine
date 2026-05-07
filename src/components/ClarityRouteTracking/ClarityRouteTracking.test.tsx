import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClarityRouteTracking } from "./ClarityRouteTracking";

const pathnameSpy = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameSpy(),
}));

beforeEach(() => {
  pathnameSpy.mockReset();
});

afterEach(() => {
  delete (window as unknown as { clarity?: unknown }).clarity;
});

describe("ClarityRouteTracking", () => {
  it("does NOT fire on the initial render (Clarity captures initial-load itself)", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    pathnameSpy.mockReturnValue("/book/soul-blueprint");
    render(<ClarityRouteTracking />);
    expect(clarityMock).not.toHaveBeenCalled();
  });

  it("fires clarity('set', 'page', pathname) on a subsequent path change", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    pathnameSpy.mockReturnValue("/book/soul-blueprint");
    const { rerender } = render(<ClarityRouteTracking />);
    pathnameSpy.mockReturnValue("/book/soul-blueprint/letter");
    rerender(<ClarityRouteTracking />);
    expect(clarityMock).toHaveBeenCalledWith(
      "set",
      "page",
      "/book/soul-blueprint/letter",
    );
  });

  it("does NOT fire when window.clarity is unavailable", () => {
    pathnameSpy.mockReturnValue("/a");
    const { rerender } = render(<ClarityRouteTracking />);
    pathnameSpy.mockReturnValue("/b");
    expect(() => rerender(<ClarityRouteTracking />)).not.toThrow();
  });
});
