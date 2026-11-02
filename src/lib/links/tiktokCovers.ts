import "server-only";

import { unstable_cache } from "next/cache";

import { isTikTokCoverUrl, isTikTokVideoLink, type TikTokVideo, tiktokVideoId } from "./tiktokVideo";

const OEMBED_ENDPOINT = "https://www.tiktok.com/oembed";
const REFRESH_SECONDS = 60 * 60;
const TIKTOK_TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 3;

type TikTokCover = { coverUrl?: string; title?: string };

export async function followTikTokLink(link: string): Promise<string> {
  let current = link.trim();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (tiktokVideoId(current)) return current;
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIKTOK_TIMEOUT_MS),
    });
    const location = response.headers.get("location");
    if (!location) break;
    current = new URL(location, current).toString();
  }
  throw new Error(`TikTok link did not lead to a video: ${link}`);
}

export async function lookUpTikTokCover(videoUrl: string): Promise<TikTokCover> {
  const response = await fetch(`${OEMBED_ENDPOINT}?url=${encodeURIComponent(videoUrl)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIKTOK_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`TikTok oEmbed answered ${response.status}`);
  const body = (await response.json()) as { thumbnail_url?: unknown; title?: unknown };
  return {
    coverUrl:
      typeof body.thumbnail_url === "string" && isTikTokCoverUrl(body.thumbnail_url) ? body.thumbnail_url : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
  };
}

const cachedFollow = unstable_cache(followTikTokLink, ["tiktok-link"], { revalidate: REFRESH_SECONDS });
const cachedCover = unstable_cache(lookUpTikTokCover, ["tiktok-cover"], { revalidate: REFRESH_SECONDS });

async function resolveVideo(link: string): Promise<TikTokVideo | null> {
  try {
    const url = await cachedFollow(link);
    const videoId = tiktokVideoId(url);
    if (!videoId) return null;
    const cover = await cachedCover(url).catch(() => ({}));
    return { videoId, url, ...cover };
  } catch (error) {
    console.error("[tt-videos] link could not be followed", error);
    return null;
  }
}

export async function resolveTikTokVideos(links: readonly (string | undefined)[]): Promise<TikTokVideo[]> {
  const accepted = [...new Set(links.filter(isTikTokVideoLink).map((link) => (link as string).trim()))];
  const resolved = await Promise.all(accepted.map(resolveVideo));
  const seen = new Set<string>();
  return resolved.filter((video): video is TikTokVideo => {
    if (!video || seen.has(video.videoId)) return false;
    seen.add(video.videoId);
    return true;
  });
}
