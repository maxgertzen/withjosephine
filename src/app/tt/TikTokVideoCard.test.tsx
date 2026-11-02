import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSENT_STORAGE_KEY, writeConsent } from "@/lib/consent";
import { CONSENT_REQUIRED_COOKIE } from "@/lib/region";

import { TikTokVideoCard } from "./TikTokVideoCard";

const VIDEO_ID = "7700268561549544711";

function inConsentRegion(required: boolean) {
  document.cookie = `${CONSENT_REQUIRED_COOKIE}=${required ? "1" : "0"}; path=/`;
}

let cardsInView = true;

class ObserverThatSeesCardsInView {
  constructor(private readonly report: (entries: { isIntersecting: boolean }[]) => void) {}
  observe() {
    this.report([{ isIntersecting: cardsInView }]);
  }
  disconnect() {}
}

beforeEach(() => {
  cardsInView = true;
  vi.stubGlobal("IntersectionObserver", ObserverThatSeesCardsInView);
});

const playerSrc = (container: HTMLElement) => container.querySelector("iframe")?.getAttribute("src") ?? null;

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = `${CONSENT_REQUIRED_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
});

describe("TikTokVideoCard", () => {
  it("shows TikTok's player straight away where no consent is needed, without playing", () => {
    inConsentRegion(false);
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    expect(playerSrc(container)).toMatch(new RegExp(`/player/v1/${VIDEO_ID}\\?autoplay=0`));
  });

  it("always shows the player in the Studio preview", () => {
    inConsentRegion(true);
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview />);
    expect(playerSrc(container)).toMatch(/autoplay=0/);
  });

  it("records a tap on the play button for analytics", () => {
    inConsentRegion(true);
    render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    const button = screen.getByRole("button", { name: "Play video: TikToks 1" });
    expect(button).toHaveAttribute("data-mp-event", "links_video_play");
    expect(button).toHaveAttribute("data-clarity-event", "tt_video_play");
  });

  it("loads no player for a card that has not come into view", () => {
    inConsentRegion(false);
    cardsInView = false;
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    expect(playerSrc(container)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("treats a missing region cookie as a consent region", () => {
    document.cookie = `${CONSENT_REQUIRED_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    expect(playerSrc(container)).toBeNull();
    expect(screen.getByRole("button", { name: "Play video: TikToks 1" })).toBeInTheDocument();
  });

  it("waits for a tap where consent is needed and not given, then plays", async () => {
    inConsentRegion(true);
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    expect(playerSrc(container)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Play video: TikToks 1" }));

    expect(playerSrc(container)).toMatch(/autoplay=1/);
  });

  it("shows the player as soon as the visitor accepts the banner", () => {
    inConsentRegion(true);
    const { container } = render(<TikTokVideoCard videoId={VIDEO_ID} title="TikToks 1" playLabel="Play video" inStudioPreview={false} />);
    expect(playerSrc(container)).toBeNull();

    act(() => writeConsent("granted"));

    expect(playerSrc(container)).toMatch(/autoplay=0/);
  });
});
