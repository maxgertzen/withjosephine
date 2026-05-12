// Allowlist for post-auth redirect targets — keeps the open-redirect
// surface zero. Anything else collapses to /my-readings.
const ALLOWED_NEXT_PATHS = /^\/(listen\/[A-Za-z0-9_-]+|my-readings|my-gifts)\/?$/;
const LISTEN_PATH = /^\/listen\/[A-Za-z0-9_-]+\/?$/;

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/my-readings";
  return ALLOWED_NEXT_PATHS.test(raw) ? raw : "/my-readings";
}

export function isListenNext(path: string): boolean {
  return LISTEN_PATH.test(path);
}
