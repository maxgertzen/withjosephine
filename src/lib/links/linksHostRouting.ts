import { LINKS_HOST, LINKS_PAGE_ORIGIN, MAIN_SITE_HOSTS, MAIN_SITE_ORIGIN, ROUTES } from "@/lib/constants";
import { CONSENT_API_ROUTE } from "@/lib/http/routes";

const LINKS_PAGE_API_ROUTES: ReadonlySet<string> = new Set([CONSENT_API_ROUTE]);

const TAP_COUNTER_PREFIX = `${ROUTES.tt}/go/`;

export function tapCounterPath(key: string): string {
  return `${TAP_COUNTER_PREFIX}${key}`;
}

export function isTapCounterPath(pathname: string): boolean {
  return pathname.startsWith(TAP_COUNTER_PREFIX);
}

export type HostRoute =
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect"; url: string }
  | null;

export function routeLinksHost(host: string, pathname: string, search: string): HostRoute {
  if (host === LINKS_HOST) {
    const tappedFromLinksPage = new URLSearchParams(search).has("utm_content");
    if (pathname === "/" && !tappedFromLinksPage) return { kind: "rewrite", pathname: ROUTES.tt };
    if (LINKS_PAGE_API_ROUTES.has(pathname)) return null;
    return { kind: "redirect", url: `${MAIN_SITE_ORIGIN}${pathname}${search}` };
  }
  if (MAIN_SITE_HOSTS.includes(host) && pathname === ROUTES.tt) {
    return { kind: "redirect", url: `${LINKS_PAGE_ORIGIN}/${search}` };
  }
  return null;
}
