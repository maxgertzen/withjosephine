// Allowlist for post-auth redirect targets — anything else collapses to
// the home page, keeping the open-redirect surface zero.
const ALLOWED_NEXT_PATHS = /^\/(listen\/[A-Za-z0-9_-]+)\/?$/;
const LISTEN_PATH = /^\/listen\/[A-Za-z0-9_-]+\/?$/;

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  return ALLOWED_NEXT_PATHS.test(raw) ? raw : "/";
}

export function isListenNext(path: string): boolean {
  return LISTEN_PATH.test(path);
}
