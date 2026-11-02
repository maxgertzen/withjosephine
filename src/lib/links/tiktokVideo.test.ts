import { describe, expect, it } from "vitest";

import { isTikTokVideoLink, tiktokPlayerUrl, tiktokVideoId } from "./tiktokVideo";

describe("tiktokVideoId", () => {
  it("reads the video number from a copied TikTok video link", () => {
    expect(tiktokVideoId("https://www.tiktok.com/@withjosephine/video/7412345678901234567?is_from_webapp=1&sender_device=pc")).toBe(
      "7412345678901234567",
    );
    expect(tiktokVideoId(" https://tiktok.com/@with.josephine/video/7412345678901234567 ")).toBe("7412345678901234567");
  });

  it("reads the video number from a link copied out of TikTok's video player", () => {
    expect(
      tiktokVideoId(
        "https://www.tiktok.com/@withjosephine?utm_campaign=&utm_source=unknown&refer=player_v1&referrer_url=https%3A%2F%2Fwww.tiktok.com%2Fplayer%2Fv1%2F7700268561549544711&referer_video_id=7700268561549544711",
      ),
    ).toBe("7700268561549544711");
    expect(tiktokVideoId("https://evil.example/@a?referer_video_id=7700268561549544711")).toBeNull();
    expect(tiktokVideoId("https://www.tiktok.com/@a?referer_video_id=abc")).toBeNull();
  });

  it("refuses profiles, other sites and look-alikes", () => {
    expect(tiktokVideoId("https://www.tiktok.com/@withjosephine")).toBeNull();
    expect(tiktokVideoId("https://evil.example/@a/video/7412345678901234567")).toBeNull();
    expect(tiktokVideoId("https://www.tiktok.com.evil.example/@a/video/7412345678901234567")).toBeNull();
    expect(tiktokVideoId(undefined)).toBeNull();
  });

  it("builds the TikTok player address for a video", () => {
    expect(tiktokPlayerUrl("7412345678901234567", { autoplay: false })).toMatch(
      /^https:\/\/www\.tiktok\.com\/player\/v1\/7412345678901234567\?autoplay=0/,
    );
  });
});

describe("isTikTokVideoLink", () => {
  it("accepts full links and the short links the TikTok app copies", () => {
    for (const link of [
      "https://www.tiktok.com/@withjosephine/video/7412345678901234567",
      "https://m.tiktok.com/v/7412345678901234567.html",
      "https://vm.tiktok.com/ZMabc123/",
      "https://vt.tiktok.com/ZSxyz789/",
      "https://www.tiktok.com/t/ZTRabc123/",
    ]) {
      expect(isTikTokVideoLink(link), link).toBe(true);
    }
  });

  it("accepts extra path parts and capitals after the video number", () => {
    expect(tiktokVideoId("https://www.tiktok.com/@withjosephine/video/7412345678901234567/extra")).toBe("7412345678901234567");
    expect(tiktokVideoId("https://m.tiktok.com/V/7412345678901234567.html")).toBe("7412345678901234567");
  });

  it("refuses profiles and other sites", () => {
    expect(isTikTokVideoLink("https://www.tiktok.com/@withjosephine")).toBe(false);
    expect(isTikTokVideoLink("https://vm.tiktok.com.evil.example/ZMabc/")).toBe(false);
  });
});
