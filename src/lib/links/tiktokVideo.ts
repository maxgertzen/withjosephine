const TIKTOK_HOSTS = new Set(["tiktok.com", "www.tiktok.com", "m.tiktok.com"]);
const SHORT_LINK_HOSTS = new Set(["vm.tiktok.com", "vt.tiktok.com"]);
const VIDEO_PATH = /^\/(?:@[\w.-]+\/video\/(\d+)|v\/(\d+)(?:\.html)?)(?:\/.*)?$/i;
const SHORT_CODE_PATH = /^\/[\w-]+\/?$/;
const SHARE_PATH = /^\/t\/[\w-]+\/?$/;
const VIDEO_NUMBER = /^\d{8,25}$/;

export const TIKTOK_PLAYER_ORIGIN = "https://www.tiktok.com";

function httpsUrl(value: string | undefined): URL | null {
  try {
    const url = new URL(value?.trim() ?? "");
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function tiktokVideoId(value: string | undefined): string | null {
  const url = httpsUrl(value);
  if (!url || !TIKTOK_HOSTS.has(url.hostname)) return null;
  const path = url.pathname.match(VIDEO_PATH);
  const id = path?.[1] ?? path?.[2] ?? url.searchParams.get("referer_video_id");
  return id && VIDEO_NUMBER.test(id) ? id : null;
}

export function isTikTokVideoLink(value: string | undefined): value is string {
  if (tiktokVideoId(value)) return true;
  const url = httpsUrl(value);
  if (!url) return false;
  if (SHORT_LINK_HOSTS.has(url.hostname)) return SHORT_CODE_PATH.test(url.pathname);
  return TIKTOK_HOSTS.has(url.hostname) && SHARE_PATH.test(url.pathname);
}

export function tiktokPlayerUrl(videoId: string, { autoplay }: { autoplay: boolean }): string {
  return `${TIKTOK_PLAYER_ORIGIN}/player/v1/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&description=0&music_info=0`;
}
