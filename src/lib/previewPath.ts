import { ROUTES } from "@/lib/constants";
import { isLegalSlug } from "@/lib/legalSlugs";

const PREVIEW_ROOT = "/preview";
const PREFIXED_PREVIEW_PATHS = [/^\/book\/[^/]+$/, /^\/notes(\/[^/]+)?$/];

export function previewPathFor(pathname: string): string | undefined {
  if (pathname === ROUTES.home) return PREVIEW_ROOT;
  if (isLegalSlug(pathname.slice(1)) || PREFIXED_PREVIEW_PATHS.some((pattern) => pattern.test(pathname))) {
    return `${PREVIEW_ROOT}${pathname}`;
  }
  return undefined;
}
