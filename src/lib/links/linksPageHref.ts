import { bookingPath } from "@/lib/http/routes";
import { notePath } from "@/lib/notes/notes";

import { isHttpsAddress, type LinkTarget } from "./linkKey";

const TIKTOK_BIO_UTM = { utm_source: "tiktok", utm_medium: "bio" } as const;

export type LinksPageTarget = LinkTarget & { slug?: string; fileUrl?: string };

const SANITY_FILE_CDN = "https://cdn.sanity.io/files/";

type Destination = { sitePath: string } | { address: string; shareAddress: string | null; opensAnApp?: true };

function destinationOf(target: LinksPageTarget): Destination | null {
  switch (target.destination) {
    case "reading":
      return target.slug ? { sitePath: bookingPath(target.slug) } : null;
    case "note":
      return target.slug ? { sitePath: notePath(target.slug) } : null;
    case "home":
      return { sitePath: "/" };
    case "email":
      return target.email
        ? { address: `mailto:${target.email.trim()}`, shareAddress: null, opensAnApp: true }
        : null;
    case "web": {
      const url = target.url?.trim();
      return url && isHttpsAddress(url) ? { address: url, shareAddress: url } : null;
    }
    case "file":
      return target.fileUrl?.startsWith(SANITY_FILE_CDN)
        ? { address: `${target.fileUrl}?dl=`, shareAddress: target.fileUrl }
        : null;
  }
}

export type LinksPageAddresses = { href: string; shareHref?: string; countsTaps: boolean };

export function linksPageAddresses(target: LinksPageTarget, key: string, siteOrigin = ""): LinksPageAddresses | null {
  const destination = destinationOf(target);
  if (!destination) return null;
  if (!("sitePath" in destination)) {
    return {
      href: destination.address,
      shareHref: destination.shareAddress ?? undefined,
      countsTaps: !("opensAnApp" in destination),
    };
  }
  const tags = new URLSearchParams({ ...TIKTOK_BIO_UTM, utm_content: key });
  return {
    href: `${siteOrigin}${destination.sitePath}?${tags.toString()}`,
    shareHref: `${siteOrigin}${destination.sitePath}`,
    countsTaps: true,
  };
}
