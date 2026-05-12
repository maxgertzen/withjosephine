import { appendEmailFired, type EmailFiredType } from "./submissions";

type SendResult = { resendId: string | null };

/**
 * Send a transactional email and audit its delivery in one call.
 *
 * The pattern this helper collapses (~5 call sites in the gift + day-N email
 * paths):
 *
 *     const result = await sendXEmail({...});
 *     if (result.resendId !== null) {
 *       await appendEmailFired(submissionId, {
 *         type: "...",
 *         sentAt: new Date().toISOString(),
 *         resendId: result.resendId,
 *       });
 *     }
 *     return result;
 *
 * **Invariant: append on success only.** When Resend is dry-run / down /
 * misconfigured (`resendId === null`), we skip the audit entry so a retry can
 * find no prior fire and try again. The webhook's gift-purchase-confirmation
 * branch uses a different pattern (pre-append a sentinel entry BEFORE the
 * send, then update on success) for idempotent replay — see
 * `stripeWebhook.ts` B5.14. Do NOT refactor that site through this helper.
 */
export async function sendAndRecord<TSend extends SendResult>(opts: {
  submissionId: string;
  type: EmailFiredType;
  send: () => Promise<TSend>;
  /**
   * Optional ISO timestamp to record on the email_fired entry. Defaults to
   * the wall-clock at the moment append fires; callers that have an
   * upstream `nowIso` for audit correlation can pass it explicitly.
   */
  nowIso?: string;
}): Promise<TSend & { appended: boolean }> {
  const result = await opts.send();
  if (result.resendId === null) {
    return { ...result, appended: false };
  }
  await appendEmailFired(opts.submissionId, {
    type: opts.type,
    sentAt: opts.nowIso ?? new Date().toISOString(),
    resendId: result.resendId,
  });
  return { ...result, appended: true };
}
