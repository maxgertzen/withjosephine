import { stegaClean } from "@sanity/client/stega";

import { isValidEmail } from "@/lib/formStyles";

import { isHttpsAddress } from "./linkKey";

export const SOCIAL_PLATFORMS = [
  { value: "tiktok", title: "TikTok" },
  { value: "instagram", title: "Instagram" },
  { value: "youtube", title: "YouTube" },
  { value: "facebook", title: "Facebook" },
  { value: "x", title: "X (Twitter)" },
  { value: "threads", title: "Threads" },
  { value: "bluesky", title: "Bluesky" },
  { value: "pinterest", title: "Pinterest" },
  { value: "snapchat", title: "Snapchat" },
  { value: "spotify", title: "Spotify" },
  { value: "applepodcasts", title: "Apple Podcasts" },
  { value: "substack", title: "Substack" },
  { value: "patreon", title: "Patreon" },
  { value: "etsy", title: "Etsy" },
  { value: "discord", title: "Discord" },
  { value: "telegram", title: "Telegram" },
  { value: "whatsapp", title: "WhatsApp" },
  { value: "email", title: "Email" },
  { value: "website", title: "Website" },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["value"];

const TITLES: Record<string, string> = Object.fromEntries(SOCIAL_PLATFORMS.map(({ value, title }) => [value, title]));

export function socialPlatformTitle(platform: string): string | undefined {
  return TITLES[platform];
}

export function socialLinkHref(platform: string, address: string | undefined): string | null {
  const trimmed = address ? stegaClean(address).trim() : "";
  if (!trimmed) return null;
  if (platform === "email") return isValidEmail(trimmed) ? `mailto:${trimmed}` : null;
  return isHttpsAddress(trimmed) ? trimmed : null;
}
