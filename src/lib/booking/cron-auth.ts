import { optionalEnv } from "../env";
import { timingSafeStringEqual } from "../hmac";
import { AUTHORIZATION_HEADER, BEARER_PREFIX } from "../http/headers";

export function scheduledCronRequest(url: string, cronSecret: string): Request {
  return new Request(url, {
    method: "POST",
    headers: { [AUTHORIZATION_HEADER]: `${BEARER_PREFIX}${cronSecret}` },
  });
}

export function isCronRequestAuthorized(request: Request) {
  const expected = optionalEnv("CRON_SECRET");
  if (!expected) return false;

  const provided = request.headers.get(AUTHORIZATION_HEADER);
  if (!provided?.startsWith(BEARER_PREFIX)) return false;

  return timingSafeStringEqual(provided.slice(BEARER_PREFIX.length), expected);
}
