import { fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { ThankYouGuard } from "./ThankYouGuard";

let pushState: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  pushState = vi.spyOn(window.history, "pushState");
});

afterEach(() => {
  replace.mockReset();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("ThankYouGuard", () => {
  it("adds no history entry and ignores Back before the visitor interacts", () => {
    render(<ThankYouGuard />);
    fireEvent.popState(window);
    expect(pushState).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("adds one history entry on the first click or key press only", () => {
    render(<ThankYouGuard />);
    fireEvent.click(document.body);
    fireEvent.keyDown(document.body, { key: "a" });
    fireEvent.click(document.body);
    expect(pushState).toHaveBeenCalledExactlyOnceWith(null, "", window.location.href);
  });

  it("stops the browser restoring the thank-you scroll position when Back lands on it", () => {
    window.history.scrollRestoration = "auto";
    render(<ThankYouGuard />);
    fireEvent.click(document.body);
    expect(window.history.scrollRestoration).toBe("manual");
  });

  it("goes home when Back lands on the added entry", () => {
    render(<ThankYouGuard />);
    fireEvent.click(document.body);
    fireEvent.popState(window);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("adds no entry when the click is on a link or button", () => {
    const { container } = render(
      <>
        <ThankYouGuard />
        <a href="mailto:hello@withjosephine.com">Email Josephine</a>
        <button type="button">Copy</button>
      </>,
    );
    fireEvent.click(container.querySelector("a")!);
    fireEvent.click(container.querySelector("button")!);
    expect(pushState).not.toHaveBeenCalled();
  });
});
