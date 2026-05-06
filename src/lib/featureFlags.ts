import { PRODUCTION_HOSTS } from "./constants";
import { isFlagEnabled } from "./env";

/**
 * Under-construction is host-aware: when the flag is on, ONLY the production
 * apex (`withjosephine.com`, `www.withjosephine.com`) shows the holding page.
 * Preview subdomains, *.workers.dev, and localhost render the full site so
 * Sanity Studio + previewers see real content while the apex stays parked.
 *
 * Pass `host` (e.g. from `headers().get("host")`) to scope the check. If
 * omitted, falls back to the legacy global behaviour (any host shows UC when
 * the flag is on) — used by tests and any caller without a request context.
 */
export function isUnderConstruction(host?: string | null): boolean {
  if (!isFlagEnabled("NEXT_PUBLIC_UNDER_CONSTRUCTION")) return false;
  if (host == null) return true;
  return PRODUCTION_HOSTS.includes(host);
}

