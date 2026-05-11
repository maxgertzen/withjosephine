import "server-only";

/**
 * Mixpanel Data Deletion API (v3) — Phase 4 GDPR cascade target.
 *
 * Verified 2026-05-11 against:
 * https://developer.mixpanel.com/reference/create-deletion
 * https://developer.mixpanel.com/reference/gdpr-api
 * https://docs.mixpanel.com/docs/privacy/end-user-data-management
 *
 * Note this is the modern Data Deletion API — NOT the legacy `$delete`
 * engage profile delete (which only removes the profile row, leaving the
 * event log intact). The v3 endpoint removes BOTH events AND profile
 * properties for the supplied `distinct_ids`.
 *
 * Region matters: the project is provisioned in US residency per PRD
 * `## Decisions` (locked 2026-05-11 via AskUserQuestion). EU projects
 * would hit `https://eu.mixpanel.com/...`; calls to the wrong region
 * return 200 with no effect. If Josephine's project ever moves residency,
 * the hardcoded base URL below MUST change in lockstep.
 *
 * Auth: HTTP Basic with the service-account username:secret pair returned
 * by Mixpanel's "Add Service Account" dialog (Project Settings → Service
 * Accounts). The API reference UI misleadingly labels this surface
 * "Bearer" — operationally it's `Authorization: Basic base64(username:secret)`.
 * The project token still rides in `?token=...` as belt-and-suspenders:
 * Basic authenticates the principal, the token disambiguates the project.
 * (Personal OAuth tokens from user settings DO use Bearer, but those are
 * user-tied and inappropriate for a server-side cascade.)
 *
 * `distinct_id` matching is literal. Verified in this codebase that we
 * track with `submission._id` as the distinct_id (see analytics/client.ts,
 * resend.tsx, stripe/webhook/route.ts). The cascade caller resolves all
 * `submission.id` values for the user being deleted and passes them as
 * the `distinct_ids` array (up to 2000 per call, well above our scale).
 */
import { optionalEnv } from "../../env";
import type { VendorResult } from "./types";
import { vendorNotConfigured } from "./types";

const MIXPANEL_API_BASE = "https://mixpanel.com/api/app/data-deletions/v3.0";

export async function createMixpanelDataDeletion(
  distinctIds: string[],
): Promise<VendorResult> {
  if (distinctIds.length === 0) {
    return { ok: false, error: "mixpanel: no distinct_ids to delete" };
  }

  const projectToken = optionalEnv("NEXT_PUBLIC_MIXPANEL_TOKEN");
  const username = optionalEnv("MIXPANEL_SERVICE_ACCOUNT_USERNAME");
  const secret = optionalEnv("MIXPANEL_SERVICE_ACCOUNT_SECRET");
  if (!projectToken || !username || !secret) return vendorNotConfigured("mixpanel");

  try {
    const response = await fetch(
      `${MIXPANEL_API_BASE}?token=${encodeURIComponent(projectToken)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${username}:${secret}`)}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ distinct_ids: distinctIds, compliance_type: "GDPR" }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "<no body>");
      return { ok: false, error: `mixpanel: HTTP ${response.status} — ${detail.slice(0, 200)}` };
    }

    const json = (await response.json()) as { tracking_id?: number | string; results?: { tracking_id?: number | string } };
    // The reference shows both `tracking_id` at root and inside `results` —
    // prefer root, fall back to nested, fall back to null. Reconciliation
    // cron will treat null as "submitted but unverifiable" and re-check.
    const id = json.tracking_id ?? json.results?.tracking_id ?? null;
    return { ok: true, trackingId: id != null ? String(id) : null };
  } catch (error) {
    return { ok: false, error: `mixpanel: ${error instanceof Error ? error.message : String(error)}` };
  }
}
