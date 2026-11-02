import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DelegatedTracking } from "./DelegatedTracking";

const trackUntypedMock = vi.fn();
const clarityEventMock = vi.fn();
const claritySetTagMock = vi.fn();

vi.mock("@/lib/analytics", () => ({
  trackUntyped: (...args: unknown[]) => trackUntypedMock(...args),
}));

vi.mock("@microsoft/clarity", () => ({
  default: {
    event: (name: string) => clarityEventMock(name),
    setTag: (key: string, value: string) => claritySetTagMock(key, value),
  },
}));

afterEach(() => {
  trackUntypedMock.mockReset();
  clarityEventMock.mockReset();
  claritySetTagMock.mockReset();
  delete (window as { clarity?: unknown }).clarity;
});

const linksPageButton = (
  <a
    href="https://withjosephine.com/tt/go/home"
    data-mp-event="links_link_click"
    data-mp-link-key="home"
    data-mp-transport="sendBeacon"
    data-clarity-event="tt_link_click"
    data-clarity-tag-tt-link="home"
  >
    Home
  </a>
);

async function clickLinksPageButton() {
  const user = userEvent.setup();
  render(
    <>
      <DelegatedTracking />
      {linksPageButton}
    </>,
  );
  await user.click(document.querySelector("a")!);
}

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
    expect(trackUntypedMock).toHaveBeenCalledWith(
      "hero_cta_click",
      { button_name: "hero", position: "top" },
      undefined,
    );
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
    expect(trackUntypedMock).toHaveBeenCalledWith("card_click", { card_id: "abc" }, undefined);
  });

  it("sends clicks marked for sendBeacon so the event survives leaving the page", async () => {
    await clickLinksPageButton();
    expect(trackUntypedMock).toHaveBeenCalledWith(
      "links_link_click",
      { link_key: "home" },
      { transport: "sendBeacon", send_immediately: true },
    );
  });

  it("sends the Clarity event and link key tag when Clarity is running", async () => {
    (window as { clarity?: unknown }).clarity = vi.fn();
    await clickLinksPageButton();
    expect(clarityEventMock).toHaveBeenCalledWith("tt_link_click");
    expect(claritySetTagMock).toHaveBeenCalledWith("tt_link", "home");
  });

  it("sends nothing to Clarity on a private link page", async () => {
    (window as { clarity?: unknown }).clarity = vi.fn();
    window.history.pushState({}, "", "/gift/abc");
    try {
      await clickLinksPageButton();
    } finally {
      window.history.pushState({}, "", "/");
    }
    expect(clarityEventMock).not.toHaveBeenCalled();
  });

  it("sends nothing to Clarity when Clarity is not running", async () => {
    await clickLinksPageButton();
    expect(clarityEventMock).not.toHaveBeenCalled();
    expect(claritySetTagMock).not.toHaveBeenCalled();
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
