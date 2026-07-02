"use client";

import { useCallback, useRef, useState } from "react";

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
 */
export function useMutationAction<T = unknown>(endpoint: string) {
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const lastArgsRef = useRef<unknown>(undefined);
  const hasLastArgsRef = useRef(false);

  const run = useCallback(
    async (body?: unknown): Promise<JsonPostResult<T>> => {
      lastArgsRef.current = body;
      hasLastArgsRef.current = true;
      setSubmitting(true);
      setTopError(null);
      setFieldErrors({});
      const result = await jsonPost<T>(endpoint, body);
      if (!result.ok) {
        if (result.fieldErrors && Object.keys(result.fieldErrors).length > 0) {
          setFieldErrors(result.fieldErrors);
        }
        if (result.topError) {
          setTopError(result.topError);
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
  }, []);

  return {
    submitting,
    topError,
    fieldErrors,
    run,
    retry,
    reset,
  };
}
