import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LinksPageViewTracking } from "./LinksPageViewTracking";

const trackMock = vi.fn();

vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => trackMock(...args),
}));

function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", { value, configurable: true });
}

afterEach(() => {
  trackMock.mockReset();
  setReferrer("");
});

describe("LinksPageViewTracking", () => {
  it("sends one page view with only the referrer host", () => {
    setReferrer("https://www.tiktok.com/@withjosephine?lang=en");
    const { rerender } = render(<LinksPageViewTracking />);
    rerender(<LinksPageViewTracking />);

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith("links_page_view", {
      referrer_host: "www.tiktok.com",
      viewport_width: window.innerWidth,
    });
  });

  it("sends an empty referrer host for a direct visit", () => {
    render(<LinksPageViewTracking />);

    expect(trackMock).toHaveBeenCalledWith("links_page_view", expect.objectContaining({ referrer_host: "" }));
  });
});
