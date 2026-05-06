import { HEADLESS_UA_PATTERN } from "./headless";
import type { ServerEventMap, ServerEventName } from "./server-events";

const MIXPANEL_TRACK_ENDPOINT = "https://api-js.mixpanel.com/track";

type ServerEnvironment = "production" | "staging" | "local";

function deriveEnvironment(): ServerEnvironment {
  const value = process.env.ENVIRONMENT;
  if (value === "production" || value === "staging") return value;
  return "local";
}

function isTrackingAllowed(env: ServerEnvironment): boolean {
  if (env === "production") return true;
  return process.env.NEXT_PUBLIC_TRACK_NON_PROD === "1";
}

function encodePayload(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  // btoa accepts a binary-safe ASCII string; JSON output is ASCII-safe
  // because non-ASCII chars are escaped as \uXXXX by JSON.stringify.
  if (typeof btoa === "function") return btoa(json);
  return Buffer.from(json, "utf8").toString("base64");
}

export async function serverTrack<E extends ServerEventName>(
  event: E,
  properties: ServerEventMap[E] & { distinct_id: string },
  opts?: { userAgent?: string },
): Promise<void> {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) return;

  if (opts?.userAgent && HEADLESS_UA_PATTERN.test(opts.userAgent)) return;

  const environment = deriveEnvironment();
  if (!isTrackingAllowed(environment)) return;

  const { distinct_id, ...userProps } = properties;

  const payload = {
    event,
    properties: {
      token,
      distinct_id,
      time: Math.floor(Date.now() / 1000),
      environment,
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || "dev",
      source: "server",
      ...userProps,
    },
  };

  const body = new URLSearchParams({ data: encodePayload(payload) });

  try {
    await fetch(MIXPANEL_TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // keepalive lets the track call finish after a short-lived worker
      // request handler returns its response.
      keepalive: true,
    });
  } catch (error) {
    // Token deliberately omitted from any log line.
    console.warn(`[serverTrack] failed to POST event=${event}`, error);
  }
}

export function generateAnonymousDistinctId(): string {
  const uuid = globalThis.crypto.randomUUID();
  return `anon-${uuid}`;
}
