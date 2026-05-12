import { format, parseISO } from "date-fns";

import { AuthGatedPage } from "@/components/AuthGatedPage/AuthGatedPage";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { MyGiftsPageContent } from "@/data/defaults";
import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { recipientLabelFor } from "@/lib/booking/giftPersonas";
import {
  giftResendRateLimit,
  type GiftStatus,
  giftStatusFor,
} from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { PAGE_ORBS } from "@/lib/celestialPresets";

import {
  GiftCardActions,
  type GiftCardData,
  type ResendVerdictSummary,
} from "./GiftCardActions";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

function computeResendVerdict(gift: SubmissionRecord): ResendVerdictSummary | undefined {
  if (gift.giftDeliveryMethod !== GIFT_DELIVERY.selfSend) return undefined;
  const nowMs = Date.now();
  const verdict = giftResendRateLimit(gift.emailsFired, nowMs);
  if (verdict.allowed) return { allowed: true };
  // Compute when the hour-cap or day-cap window rolls forward enough to
  // allow another send. The cap is set against the most recent gift_resend
  // entry; nextAvailable = oldestEntryInWindow + windowMs.
  const resendsMs = (gift.emailsFired ?? [])
    .filter((e) => e.type === "gift_resend")
    .map((e) => Date.parse(e.sentAt))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const windowMs = verdict.reason === "hour_cap" ? ONE_HOUR_MS : ONE_DAY_MS;
  const oldestInWindow = resendsMs.find((t) => nowMs - t < windowMs) ?? nowMs;
  const nextAvailableAt = new Date(oldestInWindow + windowMs).toISOString();
  return { allowed: false, reason: verdict.reason, nextAvailableAt };
}

/**
 * Phase 5 Session 4b — B6.22. Build the narrow client-side view-model from
 * the full server-side record. Drops purchaser email + financial fields +
 * stripe ids so they never enter the React tree of the client component.
 * Pre-computed `resendVerdict` exposes only the verdict the UI needs to
 * disable the CTA + render a "next available at" hint, without leaking
 * raw `emailsFired` entries (which carry Resend message IDs).
 */
function toGiftCardData(gift: SubmissionRecord): GiftCardData {
  return {
    _id: gift._id,
    responses: gift.responses,
    recipientEmail: gift.recipientEmail,
    giftSendAt: gift.giftSendAt,
    resendVerdict: computeResendVerdict(gift),
  };
}

export type MyGiftsViewProps = {
  copy: MyGiftsPageContent;
  state:
    | { kind: "list"; gifts: SubmissionRecord[] }
    | { kind: "signIn" }
    | { kind: "checkEmail" };
};

export function MyGiftsView({ copy, state }: MyGiftsViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        {state.kind === "list" ? (
          <GiftsList gifts={state.gifts} copy={copy} />
        ) : (
          <AuthGatedPage
            state={state.kind}
            copy={copy}
            magicLinkNext="/my-gifts"
            resendHref="/my-gifts"
          />
        )}
      </main>
      <Footer className="relative z-10 mt-12" />
    </div>
  );
}

function GiftsList({ gifts, copy }: { gifts: SubmissionRecord[]; copy: MyGiftsPageContent }) {
  return (
    <>
      <header className="text-center">
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {copy.listHeading}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {copy.listSubheading}
        </p>
      </header>
      <GoldDivider className="max-w-xs mx-auto my-12" />
      {gifts.length === 0 ? (
        <EmptyState copy={copy} />
      ) : (
        <>
          <ul className="space-y-6">
            {gifts.map((gift) => (
              <GiftCard key={gift._id} gift={gift} copy={copy} />
            ))}
          </ul>
          <p className="mt-12 text-center font-display italic text-sm text-j-text-muted">
            {copy.privacyNote}
          </p>
        </>
      )}
    </>
  );
}

function GiftCard({ gift, copy }: { gift: SubmissionRecord; copy: MyGiftsPageContent }) {
  const status = giftStatusFor(gift);
  const recipientLabel = recipientLabelFor(gift);
  return (
    <li className="border border-j-blush rounded-2xl bg-j-ivory px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="font-display italic text-xl text-j-text-heading">
            {gift.reading?.name ?? "A reading"}
            <span className="font-display italic text-j-text-muted"> · for {recipientLabel}</span>
          </h2>
          <p className="font-body text-sm text-j-text-muted mt-1">
            {statusLine(status, copy)}
          </p>
        </div>
        <GiftCardActions gift={toGiftCardData(gift)} status={status} copy={copy} />
      </div>
    </li>
  );
}

function statusLine(status: GiftStatus, copy: MyGiftsPageContent): string {
  switch (status.kind) {
    case "scheduled":
      return `${copy.statusScheduledLabel} ${formatDate(status.sendAt)}`;
    case "self_send_ready":
      return copy.statusSelfSendReadyLabel;
    case "sent_waiting_recipient":
      return copy.statusSentLabel;
    case "recipient_preparing":
      return copy.statusPreparingLabel;
    case "delivered":
      return `${copy.statusDeliveredLabel} ${formatDate(status.deliveredAt)}`;
    case "cancelled":
      return copy.statusCancelledLabel;
  }
}

function EmptyState({ copy }: { copy: MyGiftsPageContent }) {
  return (
    <div className="text-center">
      <h2 className="font-display italic text-2xl text-j-text-heading">{copy.emptyHeading}</h2>
      <p className="font-body text-base text-j-text mt-4 max-w-md mx-auto leading-[1.6]">
        {copy.emptyBody}
      </p>
      <div className="mt-10">
        <Button href="/#readings" size="lg">
          {copy.emptyCtaLabel}
        </Button>
      </div>
    </div>
  );
}


function formatDate(iso: string): string {
  return format(parseISO(iso), "MMMM d, yyyy");
}
