import { socialPlatformTitle } from "./socialPlatforms";

export const SHARE_APPS = ["whatsapp", "facebook", "x", "telegram", "email"] as const;

export type ShareApp = (typeof SHARE_APPS)[number];

const SHORT_NAMES: Partial<Record<ShareApp, string>> = { x: "X" };

export function shareAppName(app: ShareApp, emailWord: string): string {
  if (app === "email") return emailWord;
  return SHORT_NAMES[app] ?? socialPlatformTitle(app) ?? app;
}

export function shareAppHref(app: ShareApp, url: string, text: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  switch (app) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "x":
      return `https://x.com/intent/post?url=${encodedUrl}&text=${encodedText}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    case "email":
      return `mailto:?subject=${encodedText}&body=${encodedUrl}`;
  }
}
