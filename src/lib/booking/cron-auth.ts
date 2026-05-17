import { optionalEnv } from "../env";
import { timingSafeStringEqual } from "../hmac";
import {
  AUTHORIZATION_HEADER,
  BEARER_PREFIX,
  CF_CRON_HEADER,
} from "../http/headers";

export function isCronRequestAuthorized(request: Request) {
  if (request.headers.get(CF_CRON_HEADER)) return true;

  const expected = optionalEnv("CRON_SECRET");
  if (!expected) return false;

  const provided = request.headers.get(AUTHORIZATION_HEADER);
  if (!provided?.startsWith(BEARER_PREFIX)) return false;

  return timingSafeStringEqual(provided.slice(BEARER_PREFIX.length), expected);
}
