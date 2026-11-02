import "server-only";

import { unstable_cache } from "next/cache";

import { isTikTokVideoLink, tiktokVideoId } from "./tiktokVideo";

const REFRESH_SECONDS = 60 * 60;
const TIKTOK_TIMEOUT_MS = 3000;
const MAX_REDIRECTS = 3;

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

const cachedFollow = unstable_cache(followTikTokLink, ["tiktok-link"], { revalidate: REFRESH_SECONDS });

async function resolveVideoId(link: string): Promise<string | null> {
  const direct = tiktokVideoId(link);
  if (direct) return direct;
  try {
    return tiktokVideoId(await cachedFollow(link));
  } catch (error) {
    console.error("[tt-videos] link could not be followed", error);
    return null;
  }
}

export async function resolveTikTokVideoIds(links: readonly (string | undefined)[]): Promise<string[]> {
  const accepted = [...new Set(links.filter(isTikTokVideoLink).map((link) => link.trim()))];
  const ids = await Promise.all(accepted.map(resolveVideoId));
  return [...new Set(ids.filter((id): id is string => id !== null))];
}
