"use client";

import { useState } from "react";

import { jsonPost, type JsonPostResult } from "@/lib/http/jsonPost";

/**
 * Tracks the in-flight / error state of a single mutation endpoint. Wraps
 * `jsonPost` so callers don't reimplement `setSubmitting → fetch → branch on
 * status → set top-or-field error → finally reset submitting` every time.
 *
 * The hook is intentionally copy-agnostic: `topError` carries an error
 * **code** (`"network"`, `"rate_limited"`, `"http_500"`, etc.), not a
 * user-facing string. Consumers map the code to a Sanity-editable label so
 * the operator (Becky) can tune wording without a deploy.
 *
 * **Why not React Server Actions (B4.13 feasibility outcome).**
 * Server Actions would let the 3 `/my-gifts` mutation routes (`edit-recipient`,
 * `cancel-auto-send`, `resend-link`) be invoked via `<form action={…}>` with
 * `revalidatePath('/my-gifts')` instead of `router.refresh()`. On the Cloudflare
 * Workers runtime via @opennextjs/cloudflare 1.19.4 (the version this repo is
 * pinned to), the React server-action manifest + flight-encoded inputs have
 * historically been fragile: the action lookup table is regenerated per build
 * and any worker-bundle restructuring (the same surface that triggers the
 * `outputFileTracingExcludes` workStore bug documented in next.config.ts) is
 * adjacent to the same edge-bundle reshape. Switching three routes that all
 * gate on stable D1 transactions to a runtime path that's both newer and
 * worse-tested on workerd is too much risk vs reward this close to launch.
 * `useMutationAction` ships the same ergonomic win (one-line call site,
 * consistent error shape, no fetch boilerplate) without that runtime risk.
 * Re-evaluate when OpenNext publishes a release whose changelog notes
 * "stable Server Actions on Cloudflare Workers".
 */
export function useMutationAction<T = unknown>(endpoint: string) {
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run(body?: unknown): Promise<JsonPostResult<T>> {
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
  }

  function reset() {
    setTopError(null);
    setFieldErrors({});
  }

  return { submitting, topError, fieldErrors, run, reset };
}
