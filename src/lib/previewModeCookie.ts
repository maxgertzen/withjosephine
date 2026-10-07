import { cookieFlagIsSet } from "@/lib/cookieFlag";
import { DRAFT_DISABLE_ROUTE } from "@/lib/http/routes";

export const PREVIEW_ACTIVE_COOKIE = "preview-active";

const REDIRECT_BASE = "https://same-site.invalid";

export function previewActiveFromCookie(cookie: string): boolean {
  return cookieFlagIsSet(cookie, PREVIEW_ACTIVE_COOKIE);
}

export function leavePreviewHref(currentPath: string): string {
  return `${DRAFT_DISABLE_ROUTE}?redirect=${encodeURIComponent(currentPath)}`;
}

export function safeRedirectPath(redirect: string | null): string {
  if (!redirect?.startsWith("/")) return "/";
  const target = new URL(redirect, REDIRECT_BASE);
  return target.origin === REDIRECT_BASE ? `${target.pathname}${target.search}${target.hash}` : "/";
}
