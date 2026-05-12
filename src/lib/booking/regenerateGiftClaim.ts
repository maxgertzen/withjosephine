import { GIFT_DELIVERY } from "./constants";
import { issueGiftClaimToken } from "./giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "./giftPersonas";
import { sendAndRecord } from "./sendAndRecord";
import { appendEmailFired, findSubmissionById, markGiftClaimSent } from "./submissions";
import { sendGiftClaimEmail } from "../resend";

export type RegenerateGiftClaimOutcome =
  | { ok: true; deliveryMethod: "self_send" | "scheduled"; targetEmailRedacted: string }
  | {
      ok: false;
      reason:
        | "not_found"
        | "not_a_gift"
        | "claimed"
        | "cancelled"
        | "cooldown"
        | "missing_target_email"
        | "send_failed";
      deliveryMethod?: "self_send" | "scheduled";
      targetEmailRedacted?: string;
    };

const COOLDOWN_MS = 5 * 60 * 1000;

function redactEmail(email: string): string {
  return email.replace(/(^.)([^@]+)(?=@)/, "$1***");
}

export async function regenerateGiftClaim(submissionId: string): Promise<RegenerateGiftClaimOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return { ok: false, reason: "not_found" };
  if (!submission.isGift || !submission.giftDeliveryMethod) {
    return { ok: false, reason: "not_a_gift" };
  }
  if (submission.giftClaimedAt) return { ok: false, reason: "claimed" };
  if (submission.giftCancelledAt) return { ok: false, reason: "cancelled" };

  const lastRegenIso = (submission.emailsFired ?? [])
    .filter((e) => e.type === "gift_claim_regenerate")
    .map((e) => Date.parse(e.sentAt))
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => b - a)[0];
  if (lastRegenIso !== undefined && Date.now() - lastRegenIso < COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }

  const targetEmail =
    submission.giftDeliveryMethod === GIFT_DELIVERY.selfSend
      ? submission.email
      : submission.recipientEmail;
  if (!targetEmail) {
    return { ok: false, reason: "missing_target_email", deliveryMethod: submission.giftDeliveryMethod };
  }

  const { tokenHash, claimUrl } = await issueGiftClaimToken();
  const nowIso = new Date().toISOString();

  const sendResult = await sendAndRecord({
    submissionId: submission._id,
    type: "gift_claim",
    nowIso,
    send: () =>
      sendGiftClaimEmail({
        submissionId: submission._id,
        recipientEmail: targetEmail,
        recipientName: recipientNameFor(submission),
        purchaserFirstName: purchaserFirstNameFor(submission),
        readingName: submission.reading?.name ?? "reading",
        giftMessage: submission.giftMessage ?? null,
        variant: "first_send",
        claimUrl,
      }),
  });

  if (sendResult.resendId === null) {
    return {
      ok: false,
      reason: "send_failed",
      deliveryMethod: submission.giftDeliveryMethod,
      targetEmailRedacted: redactEmail(targetEmail),
    };
  }

  await markGiftClaimSent(submission._id, tokenHash, nowIso);
  await appendEmailFired(submission._id, {
    type: "gift_claim_regenerate",
    sentAt: nowIso,
    resendId: sendResult.resendId,
  });

  return {
    ok: true,
    deliveryMethod: submission.giftDeliveryMethod,
    targetEmailRedacted: redactEmail(targetEmail),
  };
}
