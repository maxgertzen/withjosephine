import { type EnvVar, optionalEnv } from "../env";
import { timingSafeStringEqual } from "../hmac";
import {
  AUTHORIZATION_HEADER,
  BEARER_PREFIX,
  CF_CRON_HEADER,
} from "../http/headers";

export function scheduledCronRequest(url: string): Request {
  return new Request(url, { method: "POST", headers: { [CF_CRON_HEADER]: "1" } });
}

export function withoutCronHeader(request: Request): Request {
  if (!request.headers.has(CF_CRON_HEADER)) return request;
  const headers = new Headers(request.headers);
  headers.delete(CF_CRON_HEADER);
  return new Request(request, { headers });
}

function hasBearer(request: Request, secretName: EnvVar) {
  const expected = optionalEnv(secretName);
  if (!expected) return false;

  const provided = request.headers.get(AUTHORIZATION_HEADER);
  if (!provided?.startsWith(BEARER_PREFIX)) return false;

  return timingSafeStringEqual(provided.slice(BEARER_PREFIX.length), expected);
}

export function isCronRequestAuthorized(request: Request) {
  if (request.headers.get(CF_CRON_HEADER)) return true;
  return hasBearer(request, "CRON_SECRET");
}

export function isDeliveryWakeAuthorized(request: Request) {
  return isCronRequestAuthorized(request) || hasBearer(request, "DELIVERY_WAKE_SECRET");
}
