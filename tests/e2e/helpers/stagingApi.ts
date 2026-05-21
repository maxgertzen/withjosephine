// HTTP wrappers for the staging-mode Playwright specs.
//
// `regenerateGiftClaim` takes Playwright's `APIRequestContext` so the gift
// spec can reuse the test fixture's `extraHTTPHeaders` (CF Access headers
// attach automatically). `issueMagicLink` + the Sanity pollers use native
// `fetch` / `@sanity/client` because the listen spec calls them outside
// of a Playwright `test.use({ extraHTTPHeaders })` scope.
import type { APIRequestContext } from "@playwright/test";
import { createClient, type SanityClient } from "@sanity/client";

export const STAGING_URL =
  process.env.STAGING_URL ?? "https://staging.withjosephine.com";

const REGENERATE_GIFT_CLAIM_PATH = "/api/internal/gift-claim-regenerate";
const SANITY_API_VERSION = "2025-01-01";

export function requireStagingEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[stagingApi] env ${name} is required for this spec — source .env.staging first.`,
    );
  }
  return value;
}

export function accessHeaders(): Record<string, string> {
  return {
    "CF-Access-Client-Id": requireStagingEnv("CF_ACCESS_CLIENT_ID"),
    "CF-Access-Client-Secret": requireStagingEnv("CF_ACCESS_CLIENT_SECRET"),
  };
}

// Variant used by `test.use({ extraHTTPHeaders })` — runs at spec module load
// before `test.skip` would otherwise fire. Returns empty when env unset so the
// skip path completes cleanly instead of throwing.
export function accessHeadersOrEmpty(): Record<string, string> {
  const id = process.env.CF_ACCESS_CLIENT_ID;
  const secret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (!id || !secret) return {};
  return {
    "CF-Access-Client-Id": id,
    "CF-Access-Client-Secret": secret,
  };
}

// Per-request opt-out for Resend. When RESEND_E2E_DRY_RUN_SECRET is set on
// the runner, every sandbox request carries this header — the staging worker
// matches it against its own secret and skips the Resend API call, returning
// { kind: 'dry_run' } at the sendOrSkip seam. Staging humans don't set the
// header so their bookings still trigger real emails.
export function resendDryRunHeaderOrEmpty(): Record<string, string> {
  const secret = process.env.RESEND_E2E_DRY_RUN_SECRET;
  if (!secret) return {};
  return { "X-E2E-Resend-DryRun": secret };
}

// Composed header bundle every sandbox spec sends on every request: CF Access
// (so the request reaches staging) + Resend dry-run (so booking flows don't
// burn quota). Either subset returns empty when the corresponding env is
// unset, so the helper is safe to call in any environment.
export function sandboxRequestHeaders(): Record<string, string> {
  return { ...accessHeadersOrEmpty(), ...resendDryRunHeaderOrEmpty() };
}

export type RegenerateGiftClaimResponse = {
  outcome: "regenerated";
  to: string;
  deliveryMethod: "self_send" | "scheduled";
  resendDispatched: boolean;
  claimUrl: string;
};

export async function regenerateGiftClaim(
  request: APIRequestContext,
  submissionId: string,
  secret: string,
  options: { pollMs?: number; timeoutMs?: number } = {},
): Promise<RegenerateGiftClaimResponse> {
  const pollMs = options.pollMs ?? 3_000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  let lastBody = "";
  while (Date.now() < deadline) {
    const response = await request.post(REGENERATE_GIFT_CLAIM_PATH, {
      headers: { "x-do-secret": secret, "content-type": "application/json" },
      data: { submissionId },
    });
    if (response.ok()) {
      return (await response.json()) as RegenerateGiftClaimResponse;
    }
    lastStatus = response.status();
    lastBody = await response.text();
    if (lastStatus !== 404) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(
    `regenerateGiftClaim failed: status=${lastStatus} body=${lastBody.slice(0, 200)}`,
  );
}

export async function issueMagicLink(email: string): Promise<{
  token: string;
  verifyUrl: string;
  expiresAt: number;
}> {
  const adminToken = requireStagingEnv("ADMIN_API_KEY");
  const response = await fetch(`${STAGING_URL}/api/internal/issue-magic-link`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-admin-token": adminToken,
      ...accessHeaders(),
    },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error(
      `[stagingApi.issueMagicLink] ${response.status} ${response.statusText} for ${email}`,
    );
  }
  return (await response.json()) as {
    token: string;
    verifyUrl: string;
    expiresAt: number;
  };
}

type PollOptions = { timeoutMs?: number; pollIntervalMs?: number };

async function pollSanity<T>(args: {
  groq: string;
  params: Record<string, unknown>;
  done: (result: T | null) => boolean;
  options?: PollOptions;
  defaults: Required<PollOptions>;
}): Promise<T | null> {
  const timeoutMs = args.options?.timeoutMs ?? args.defaults.timeoutMs;
  const pollIntervalMs =
    args.options?.pollIntervalMs ?? args.defaults.pollIntervalMs;
  const client = getStagingSanityClient("read");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await client.fetch<T | null>(args.groq, args.params);
    if (args.done(result)) return result;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return null;
}

/**
 * Polls staging Sanity for a submission keyed by Stripe `session.id`. The
 * post-Stripe redirect path `/thank-you/<readingSlug>` carries the reading
 * slug, NOT the submission id — that lives on `stripeSessionId` after the
 * webhook mirror.
 */
export async function findSubmissionIdByStripeSessionId(
  stripeSessionId: string,
  options: PollOptions = {},
): Promise<string> {
  const result = await pollSanity<{ _id: string }>({
    groq: `*[_type == "submission" && stripeSessionId == $sessionId][0]{ _id }`,
    params: { sessionId: stripeSessionId },
    done: (r) => Boolean(r?._id),
    options,
    defaults: { timeoutMs: 120_000, pollIntervalMs: 2_500 },
  });
  if (!result?._id) {
    throw new Error(
      `findSubmissionIdByStripeSessionId: no submission for ${stripeSessionId}`,
    );
  }
  return result._id;
}

/** Returns the ISO timestamp once Sanity reports it, or null on timeout. */
export async function pollSanityListenedAt(
  submissionId: string,
  options: PollOptions = {},
): Promise<string | null> {
  const result = await pollSanity<{ listenedAt: string | null }>({
    groq: `*[_type == "submission" && _id == $id][0]{ listenedAt }`,
    params: { id: submissionId },
    done: (r) => Boolean(r?.listenedAt),
    options,
    defaults: { timeoutMs: 15_000, pollIntervalMs: 1_000 },
  });
  return result?.listenedAt ?? null;
}

export async function pollUntilPaid(
  submissionId: string,
  options: PollOptions = {},
): Promise<boolean> {
  const result = await pollSanity<{ status: string | null }>({
    groq: `*[_type == "submission" && _id == $id][0]{ status }`,
    params: { id: submissionId },
    done: (r) => r?.status === "paid",
    options,
    defaults: { timeoutMs: 30_000, pollIntervalMs: 1_500 },
  });
  return result?.status === "paid";
}

const clientCache: Partial<Record<"read" | "write", SanityClient>> = {};

export function getStagingSanityClient(mode: "read" | "write"): SanityClient {
  const cached = clientCache[mode];
  if (cached) return cached;
  const token =
    mode === "write"
      ? requireStagingEnv("SANITY_WRITE_TOKEN")
      : process.env.SANITY_E2E_READ_TOKEN ?? process.env.SANITY_READ_TOKEN;
  if (!token) {
    throw new Error(
      "[stagingApi] SANITY_E2E_READ_TOKEN or SANITY_READ_TOKEN required for Sanity reads.",
    );
  }
  const client = createClient({
    projectId: requireStagingEnv("NEXT_PUBLIC_SANITY_PROJECT_ID"),
    dataset: requireStagingEnv("NEXT_PUBLIC_SANITY_DATASET"),
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
  });
  clientCache[mode] = client;
  return client;
}
