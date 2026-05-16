import { redactEmail, sendGiftClaimEmail } from "../resend";
import { GIFT_DELIVERY } from "./constants";
import { issueGiftClaimToken } from "./giftClaim";
import { purchaserFirstNameFor, recipientNameFor } from "./giftPersonas";
import type { GiftDeliveryMethod } from "./persistence/repository";
import { sendAndRecord } from "./sendAndRecord";
import {
  acquireGiftResendLock,
  appendEmailFired,
  findSubmissionById,
  markGiftClaimSent,
  releaseGiftResendLock,
} from "./submissions";

export type RegenerateGiftClaimOutcome =
  | {
      ok: true;
      deliveryMethod: GiftDeliveryMethod;
      targetEmailRedacted: string;
      claimUrl: string;
    }
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
      deliveryMethod?: GiftDeliveryMethod;
      targetEmailRedacted?: string;
    };

const COOLDOWN_MS = 5 * 60 * 1000;
const REGEN_LOCK_TTL_MS = 60_000;

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

  // Atomic lock closes the cooldown-check TOCTOU: concurrent regenerations
  // (Studio double-click, Studio-action + internal DO route racing) both
  // pass the cooldown check otherwise, and the second send overwrites the
  // first's token hash mid-flight.
  const nowMs = Date.now();
  const locked = await acquireGiftResendLock(submission._id, {
    nowMs,
    lockUntilMs: nowMs + REGEN_LOCK_TTL_MS,
  });
  if (!locked) {
    return { ok: false, reason: "cooldown" };
  }

  try {
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

    // `dry_run` is a successful test-mode outcome — the token + URL were
    // generated correctly; the email-send was skipped by design (the
    // RESEND_DRY_RUN env flag is set on staging). The submission state still
    // needs to update so subsequent /gift/claim navigations work. `skipped`
    // and `failed` remain real failures (misconfig / network error).
    if (sendResult.kind !== "sent" && sendResult.kind !== "dry_run") {
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
      resendId: sendResult.kind === "sent" ? sendResult.resendId : null,
    });

    return {
      ok: true,
      deliveryMethod: submission.giftDeliveryMethod,
      targetEmailRedacted: redactEmail(targetEmail),
      claimUrl,
    };
  } finally {
    await releaseGiftResendLock(submission._id);
  }
}
