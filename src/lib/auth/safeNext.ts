// Allowlist for post-auth redirect targets — keeps the open-redirect
// surface zero. Anything else collapses to /my-readings.
//
// Phase 5 Session 4b — B8.33 decision: the spec proposed extracting an
// `isDefaultNext` helper for the two repeat-customer paths, but the
// literal `path === "/my-readings" || path === "/my-gifts"` comparisons
// it targeted no longer exist in src/ — the allowlist regex below is
// the single canonical predicate. Recording the decision inline; no
// follow-up.
const ALLOWED_NEXT_PATHS = /^\/(listen\/[A-Za-z0-9_-]+|my-readings|my-gifts)\/?$/;
const LISTEN_PATH = /^\/listen\/[A-Za-z0-9_-]+\/?$/;

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/my-readings";
  return ALLOWED_NEXT_PATHS.test(raw) ? raw : "/my-readings";
}

export function isListenNext(path: string): boolean {
  return LISTEN_PATH.test(path);
}
