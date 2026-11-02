const FULL_VIDEO_LINK = /^https:\/\/(?:www\.|m\.)?tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d{8,25})(?:\.html)?(?:[/?#].*)?$/i;
const SHORT_VIDEO_LINK = /^https:\/\/(?:(?:vm|vt)\.tiktok\.com\/|(?:www\.)?tiktok\.com\/t\/)[\w-]+\/?(?:\?.*)?$/i;

export const TIKTOK_PLAYER_ORIGIN = "https://www.tiktok.com";

const TIKTOK_COVER_DOMAINS = ["tiktokcdn.com", "tiktokcdn-us.com"];

export const TIKTOK_COVER_HOSTS = TIKTOK_COVER_DOMAINS.map((domain) => `https://*.${domain}`);

export type TikTokVideo = { videoId: string; url: string; coverUrl?: string; title?: string };

export function tiktokVideoId(url: string | undefined): string | null {
  return url?.trim().match(FULL_VIDEO_LINK)?.[1] ?? null;
}

export function isTikTokVideoLink(url: string | undefined): boolean {
  const trimmed = url?.trim() ?? "";
  return tiktokVideoId(trimmed) !== null || SHORT_VIDEO_LINK.test(trimmed);
}

export function tiktokPlayerUrl(videoId: string): string {
  return `${TIKTOK_PLAYER_ORIGIN}/player/v1/${videoId}?autoplay=1&rel=0&description=0`;
}

export function isTikTokCoverUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    return protocol === "https:" && TIKTOK_COVER_DOMAINS.some((domain) => hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}
