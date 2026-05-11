import "server-only";

/**
 * Brevo (formerly Sendinblue) — Phase 4 GDPR cascade target.
 *
 * Verified 2026-05-11 against:
 * https://developers.brevo.com/reference/delete-contact
 * https://developers.brevo.com/docs/deleting-transactional-logs-based-on-recipient-address-to
 *
 * Full GDPR erasure for a Brevo-recorded customer is TWO calls:
 *  1. DELETE /v3/contacts/{email} — sync, returns 204. Removes the contact
 *     row from audience lists. Does NOT remove past transactional sends.
 *  2. DELETE /v3/smtp/log/{email} — ASYNC, returns process_id. Removes the
 *     SMTP transactional history that the contact-delete leaves behind.
 *
 * Both calls share the `api-key: <key>` header (literal header name, NOT
 * `Authorization: Bearer`).
 *
 * Brevo isn't fully wired yet — env var `BREVO_API_KEY` may be absent
 * during 4b-block soft-launch. Cascade treats missing key as a partial
 * failure but continues; reconciliation cron will pick up the orphaned
 * Brevo contact when the integration ships.
 */
import { optionalEnv } from "../../env";
import type { VendorResult } from "./types";
import { vendorNotConfigured } from "./types";

const BREVO_API_BASE = "https://api.brevo.com/v3";

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "api-key": apiKey,
    Accept: "application/json",
  };
}

export async function deleteBrevoContact(email: string): Promise<VendorResult> {
  const apiKey = optionalEnv("BREVO_API_KEY");
  if (!apiKey) return vendorNotConfigured("brevo-contact");

  try {
    const response = await fetch(
      `${BREVO_API_BASE}/contacts/${encodeURIComponent(email)}?identifierType=email_id`,
      { method: "DELETE", headers: buildHeaders(apiKey) },
    );

    // 204 = deleted; 404 = already gone (idempotent OK); 405 = system contact.
    if (response.ok || response.status === 404) {
      return { ok: true, trackingId: null };
    }
    const detail = await response.text().catch(() => "<no body>");
    return { ok: false, error: `brevo-contact: HTTP ${response.status} — ${detail.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, error: `brevo-contact: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function deleteBrevoSmtpLog(email: string): Promise<VendorResult> {
  const apiKey = optionalEnv("BREVO_API_KEY");
  if (!apiKey) return vendorNotConfigured("brevo-smtp-log");

  try {
    const response = await fetch(
      `${BREVO_API_BASE}/smtp/log/${encodeURIComponent(email)}`,
      { method: "DELETE", headers: buildHeaders(apiKey) },
    );

    // 2xx — Brevo returns a process_id we keep for the reconciliation cron.
    if (response.ok) {
      const json = (await response.json().catch(() => ({}))) as { process_id?: number | string };
      const trackingId = json.process_id != null ? String(json.process_id) : null;
      return { ok: true, trackingId };
    }
    // 404 = nothing to delete; idempotent OK.
    if (response.status === 404) return { ok: true, trackingId: null };

    const detail = await response.text().catch(() => "<no body>");
    return { ok: false, error: `brevo-smtp-log: HTTP ${response.status} — ${detail.slice(0, 200)}` };
  } catch (error) {
    return { ok: false, error: `brevo-smtp-log: ${error instanceof Error ? error.message : String(error)}` };
  }
}
