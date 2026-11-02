import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TikTokVideoCard } from "./TikTokVideoCard";

describe("TikTokVideoCard", () => {
  it("shows only the cover until tapped, then loads the TikTok player", async () => {
    const { container } = render(
      <TikTokVideoCard
        videoId="7412345678901234567"
        coverUrl="https://p16-sign-va.tiktokcdn.com/cover.jpeg"
        title="Full moon"
        playLabel="Play video"
      />,
    );
    expect(container.querySelector("iframe")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Play video: Full moon" }));

    expect(container.querySelector("iframe")?.getAttribute("src")).toMatch(
      /^https:\/\/www\.tiktok\.com\/player\/v1\/7412345678901234567\?/,
    );
  });

  it("still plays when TikTok gave no cover", () => {
    render(<TikTokVideoCard videoId="7412345678901234567" playLabel="Play video" />);
    expect(screen.getByRole("button", { name: "Play video" })).toBeInTheDocument();
  });
});
