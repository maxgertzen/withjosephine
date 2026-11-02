import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

import { followTikTokLink, lookUpTikTokCover, resolveTikTokVideos } from "./tiktokCovers";

const VIDEO = "https://www.tiktok.com/@withjosephine/video/7400000000000000000";
const SHORT = "https://vm.tiktok.com/ZMabc123/";
const COVER = "https://p16-sign-va.tiktokcdn.com/cover.jpeg?x-expires=1";

afterEach(() => vi.unstubAllGlobals());

function tiktokAnswers(answers: Record<string, () => Response>) {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>((url) => {
    const match = Object.entries(answers).find(([prefix]) => url.startsWith(prefix));
    return match ? Promise.resolve(match[1]()) : Promise.reject(new Error(`unexpected ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const oembed = (body: object) => () => Response.json(body);
const redirectTo = (location: string) => () => new Response(null, { status: 301, headers: { location } });

describe("TikTok videos", () => {
  it("follows a short link from the TikTok app to the video", async () => {
    tiktokAnswers({ [SHORT]: redirectTo(`${VIDEO}?_r=1`) });
    expect(await followTikTokLink(SHORT)).toBe(`${VIDEO}?_r=1`);
  });

  it("fails when a short link leads nowhere", async () => {
    tiktokAnswers({ [SHORT]: () => new Response(null, { status: 200 }) });
    await expect(followTikTokLink(SHORT)).rejects.toThrow();
  });

  it("reads the cover picture and title, and drops covers from other servers", async () => {
    tiktokAnswers({ "https://www.tiktok.com/oembed": oembed({ thumbnail_url: COVER, title: "Full moon" }) });
    expect(await lookUpTikTokCover(VIDEO)).toEqual({ coverUrl: COVER, title: "Full moon" });
    tiktokAnswers({ "https://www.tiktok.com/oembed": oembed({ thumbnail_url: "https://tiktokcdn.com.evil.example/c.jpg" }) });
    expect((await lookUpTikTokCover(VIDEO)).coverUrl).toBeUndefined();
  });

  it("throws on a failed cover lookup so the failure is not kept", async () => {
    tiktokAnswers({ "https://www.tiktok.com/oembed": () => new Response(null, { status: 429 }) });
    await expect(lookUpTikTokCover(VIDEO)).rejects.toThrow();
  });

  it("returns each video once, in order, with its cover, and skips links that are not videos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    tiktokAnswers({
      [SHORT]: redirectTo(VIDEO),
      "https://www.tiktok.com/oembed": oembed({ thumbnail_url: COVER, title: "Full moon" }),
    });
    expect(await resolveTikTokVideos([SHORT, VIDEO, "https://www.tiktok.com/@withjosephine", undefined])).toEqual([
      { videoId: "7400000000000000000", url: VIDEO, coverUrl: COVER, title: "Full moon" },
    ]);
  });

  it("still shows a video whose cover could not be found", async () => {
    tiktokAnswers({ "https://www.tiktok.com/oembed": () => new Response(null, { status: 500 }) });
    expect(await resolveTikTokVideos([VIDEO])).toEqual([{ videoId: "7400000000000000000", url: VIDEO }]);
  });
});
