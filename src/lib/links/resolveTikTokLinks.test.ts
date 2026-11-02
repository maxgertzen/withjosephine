import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

import { followTikTokLink, resolveTikTokVideoIds } from "./resolveTikTokLinks";

const VIDEO = "https://www.tiktok.com/@withjosephine/video/7400000000000000000";
const SHORT = "https://vm.tiktok.com/ZMabc123/";
const PLAYER_LINK =
  "https://www.tiktok.com/@withjosephine?refer=player_v1&referer_video_id=7700268561549544711";

afterEach(() => vi.unstubAllGlobals());

function tiktokAnswers(answers: Record<string, () => Response>) {
  vi.stubGlobal(
    "fetch",
    vi.fn<(url: string) => Promise<Response>>((url) => {
      const match = Object.entries(answers).find(([prefix]) => url.startsWith(prefix));
      return match ? Promise.resolve(match[1]()) : Promise.reject(new Error(`unexpected ${url}`));
    }),
  );
}

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

  it("returns each video once, in order, and skips links that are not videos", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    tiktokAnswers({ [SHORT]: redirectTo(VIDEO) });
    expect(
      await resolveTikTokVideoIds([SHORT, VIDEO, PLAYER_LINK, "https://www.tiktok.com/@withjosephine", undefined]),
    ).toEqual(["7400000000000000000", "7700268561549544711"]);
  });
});
