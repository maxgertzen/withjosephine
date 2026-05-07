import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DelegatedTracking } from "./DelegatedTracking";

const trackUntypedMock = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackUntyped: (event: string, props: Record<string, unknown>) =>
    trackUntypedMock(event, props),
}));

afterEach(() => {
  trackUntypedMock.mockReset();
});

describe("DelegatedTracking", () => {
  it("fires trackUntyped with event name + snake_case props on tagged click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DelegatedTracking />
        <button
          type="button"
          data-mp-event="hero_cta_click"
          data-mp-button-name="hero"
          data-mp-position="top"
        >
          Click me
        </button>
      </>,
    );
    await user.click(document.querySelector("button")!);
    expect(trackUntypedMock).toHaveBeenCalledTimes(1);
    expect(trackUntypedMock).toHaveBeenCalledWith("hero_cta_click", {
      button_name: "hero",
      position: "top",
    });
  });

  it("does not fire when the click target is not tagged", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DelegatedTracking />
        <button type="button">Untagged</button>
      </>,
    );
    await user.click(document.querySelector("button")!);
    expect(trackUntypedMock).not.toHaveBeenCalled();
  });

  it("resolves the tagged ancestor when the click hits a child element", async () => {
    const user = userEvent.setup();
    render(
      <>
        <DelegatedTracking />
        <a href="#" data-mp-event="card_click" data-mp-card-id="abc">
          <span>inner span</span>
        </a>
      </>,
    );
    await user.click(document.querySelector("span")!);
    expect(trackUntypedMock).toHaveBeenCalledWith("card_click", {
      card_id: "abc",
    });
  });

  it("removes the listener on unmount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <>
        <DelegatedTracking />
        <button type="button" data-mp-event="x">
          Tagged
        </button>
      </>,
    );
    unmount();
    await user.click(document.querySelector("button")!);
    expect(trackUntypedMock).not.toHaveBeenCalled();
  });
});
