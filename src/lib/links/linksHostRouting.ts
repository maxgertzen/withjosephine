import { LINKS_HOST, LINKS_PAGE_ORIGIN, MAIN_SITE_HOSTS, MAIN_SITE_ORIGIN, ROUTES } from "@/lib/constants";

export type HostRoute =
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | null;

export function routeLinksHost(host: string, pathname: string, search: string): HostRoute {
  if (host === LINKS_HOST) {
    const tappedFromLinksPage = new URLSearchParams(search).has("utm_content");
    if (pathname === "/" && !tappedFromLinksPage) return { kind: "rewrite", pathname: ROUTES.tt };
    return { kind: "redirect", url: `${MAIN_SITE_ORIGIN}${pathname}${search}` };
  }
  if (MAIN_SITE_HOSTS.includes(host) && pathname === ROUTES.tt) {
    return { kind: "redirect", url: `${LINKS_PAGE_ORIGIN}/${search}` };
  }
  return null;
}
