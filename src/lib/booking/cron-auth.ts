import { optionalEnv } from "../env";
import { timingSafeStringEqual } from "../hmac";

const CF_CRON_HEADER = "cf-cron";
const AUTH_HEADER = "authorization";
const BEARER_PREFIX = "Bearer ";

export function isCronRequestAuthorized(request: Request): boolean {
  if (request.headers.get(CF_CRON_HEADER)) return true;

  const expected = optionalEnv("CRON_SECRET");
  if (!expected) return false;

  const provided = request.headers.get(AUTH_HEADER);
  if (!provided?.startsWith(BEARER_PREFIX)) return false;

  return timingSafeStringEqual(provided.slice(BEARER_PREFIX.length), expected);
}
