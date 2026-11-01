import { bookingPath } from "@/lib/http/routes";
import { notePath } from "@/lib/notes/notes";

import { isHttpsAddress, type LinkTarget } from "./linkKey";

const TIKTOK_BIO_UTM = { utm_source: "tiktok", utm_medium: "bio" } as const;

export type LinksPageTarget = LinkTarget & { slug?: string; fileUrl?: string };

const SANITY_FILE_CDN = "https://cdn.sanity.io/files/";

export function linksPageHref(target: LinksPageTarget, key: string, siteOrigin = ""): string | null {
  const withTikTokUtm = (path: string) =>
    `${siteOrigin}${path}?${new URLSearchParams({ ...TIKTOK_BIO_UTM, utm_content: key }).toString()}`;
  switch (target.destination) {
    case "reading":
      return target.slug ? withTikTokUtm(bookingPath(target.slug)) : null;
    case "note":
      return target.slug ? withTikTokUtm(notePath(target.slug)) : null;
    case "home":
      return withTikTokUtm("/");
    case "email":
      return target.email ? `mailto:${target.email.trim()}` : null;
    case "web":
      return target.url && isHttpsAddress(target.url) ? target.url.trim() : null;
    case "file":
      return target.fileUrl?.startsWith(SANITY_FILE_CDN) ? `${target.fileUrl}?dl=` : null;
  }
}
