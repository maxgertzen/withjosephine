import { format, parseISO } from "date-fns";

import { MagicLinkEmailForm } from "@/components/Auth/MagicLinkEmailForm";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { MyGiftsPageContent } from "@/data/defaults";
import { recipientLabelFor } from "@/lib/booking/giftPersonas";
import { type GiftStatus, giftStatusFor } from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { PAGE_ORBS } from "@/lib/celestialPresets";

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
        ) : state.kind === "checkEmail" ? (
          <CheckYourEmailCard copy={copy} />
        ) : (
          <SignInCard copy={copy} />
        )}
        <Footer />
      </main>
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
        <GiftActions gift={gift} status={status} copy={copy} />
      </div>
    </li>
  );
}

function GiftActions({
  gift,
  status,
  copy,
}: {
  gift: SubmissionRecord;
  status: GiftStatus;
  copy: MyGiftsPageContent;
}) {
  const editEndpoint = `/api/gifts/${gift._id}/edit-recipient`;
  const flipEndpoint = `/api/gifts/${gift._id}/cancel-auto-send`;
  const resendEndpoint = `/api/gifts/${gift._id}/resend-link`;
  if (status.kind === "scheduled") {
    return (
      <div className="flex flex-col gap-3">
        <ActionForm action={editEndpoint} label={copy.editRecipientCtaLabel} />
        <ActionForm action={flipEndpoint} label={copy.flipToSelfSendCtaLabel} />
      </div>
    );
  }
  if (status.kind === "self_send_ready") {
    return <ActionForm action={resendEndpoint} label={copy.resendLinkCtaLabel} />;
  }
  return null;
}

function ActionForm({ action, label }: { action: string; label: string }) {
  return (
    <form method="POST" action={action}>
      <Button type="submit" variant="outlined">
        {label}
      </Button>
    </form>
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

function SignInCard({ copy }: { copy: MyGiftsPageContent }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10">
      <h1 className="font-display italic text-3xl text-j-text-heading text-center">
        {copy.signInHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 text-center leading-[1.6]">
        {copy.signInBody}
      </p>
      <MagicLinkEmailForm
        action="/api/auth/magic-link"
        submitLabel={copy.signInButtonLabel}
        emailLabel="Email"
        hiddenFields={{ next: "/my-gifts" }}
      />
      <p className="font-display italic text-base text-j-text-muted mt-8 text-center">
        {copy.signInFootnote}
      </p>
    </div>
  );
}

function CheckYourEmailCard({ copy }: { copy: MyGiftsPageContent }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">{copy.checkEmailHeading}</h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">{copy.checkEmailBody}</p>
      <p className="font-display italic text-base text-j-text-muted mt-8">
        <a href="/my-gifts" className="underline">
          {copy.checkEmailResendLabel}
        </a>
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  return format(parseISO(iso), "MMMM d, yyyy");
}
