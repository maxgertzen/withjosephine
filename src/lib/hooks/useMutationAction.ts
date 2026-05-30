"use client";

import { useCallback, useRef, useState } from "react";

import { CONTACT_EMAIL } from "@/lib/constants";
import { jsonPost, type JsonPostResult } from "@/lib/http/jsonPost";

/**
 * Tracks the in-flight + error state of a single mutation endpoint. Wraps
 * `jsonPost` so callers skip the `setSubmitting → fetch → branch → reset`
 * boilerplate. `topError` is an error **code** (e.g. `"network"`,
 * `"rate_limited"`, `"http_500"`) so consumers can map to Sanity copy.
 *
 * Shipped instead of React Server Actions — OpenNext 1.19.4 on Cloudflare
 * Workers has fragile server-action support; see `www/docs/BACKLOG.md`
 * for the trigger to revisit.
 *
 * Step-up auth extension (Phase 3): when an endpoint returns 401 with
 * `{ error: "elevation_required", contactMailto }`, the hook surfaces
 * `elevationRequired` instead of `topError` and remembers the last call's
 * arguments so the OTP modal's `onElevated` callback can invoke `retry()`
 * to replay the original mutation post-elevation.
 */
export type ElevationRequired = {
  contactMailto: string;
};

export function useMutationAction<T = unknown>(endpoint: string) {
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [elevationRequired, setElevationRequired] =
    useState<ElevationRequired | null>(null);
  const lastArgsRef = useRef<unknown>(undefined);
  const hasLastArgsRef = useRef(false);

  const run = useCallback(
    async (body?: unknown): Promise<JsonPostResult<T>> => {
      lastArgsRef.current = body;
      hasLastArgsRef.current = true;
      setSubmitting(true);
      setTopError(null);
      setFieldErrors({});
      setElevationRequired(null);
      const result = await jsonPost<T>(endpoint, body);
      if (!result.ok) {
        const elevation = readElevationRequired(result);
        if (elevation) {
          setElevationRequired(elevation);
        } else {
          if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
            setFieldErrors(result.fieldErrors);
          }
          if (result.topError) {
            setTopError(result.topError);
          }
        }
      }
      setSubmitting(false);
      return result;
    },
    [endpoint],
  );

  const retry = useCallback(async (): Promise<JsonPostResult<T> | null> => {
    if (!hasLastArgsRef.current) return null;
    return run(lastArgsRef.current);
  }, [run]);

  const reset = useCallback(() => {
    setTopError(null);
    setFieldErrors({});
    setElevationRequired(null);
  }, []);

  return {
    submitting,
    topError,
    fieldErrors,
    elevationRequired,
    run,
    retry,
    reset,
  };
}

function readElevationRequired(
  result: JsonPostResult<unknown>,
): ElevationRequired | null {
  if (result.status !== 401) return null;
  const body = result.errorBody;
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.error !== "elevation_required") return null;
  const mailto =
    typeof record.contactMailto === "string" && record.contactMailto.length > 0
      ? record.contactMailto
      : `mailto:${CONTACT_EMAIL}`;
  return { contactMailto: mailto };
}
