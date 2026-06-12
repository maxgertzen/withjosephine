"use client";

import { format, parseISO } from "date-fns";

import { GiftCardActions } from "@/app/my-gifts/GiftCardActions";
import { toGiftCardData } from "@/app/my-gifts/giftCardData";
import { AuthGatedPage } from "@/components/AuthGatedPage/AuthGatedPage";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GiftStatusPill } from "@/components/GiftStatusPill";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { MyGiftsPageContent, MyReadingsPageContent } from "@/data/defaults";
import { recipientLabelFor } from "@/lib/booking/giftPersonas";
import { giftStatusFor } from "@/lib/booking/giftStatus";
import { isReadingExpired } from "@/lib/booking/readingRetention";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SubmissionRecord } from "@/lib/page-previews/types";

export type LibraryViewState =
  | {
      kind: "list";
      readings: SubmissionRecord[];
      gifts: SubmissionRecord[];
    }
  | { kind: "signIn" }
  | { kind: "checkEmail" };

export type LibraryViewProps = {
  state: LibraryViewState;
  readingsCopy: MyReadingsPageContent;
  giftsCopy: MyGiftsPageContent;
};

export function LibraryView({
  state,
  readingsCopy,
  giftsCopy,
}: LibraryViewProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        {state.kind === "list" ? (
          <LibraryListView
            readings={state.readings}
            gifts={state.gifts}
            readingsCopy={readingsCopy}
            giftsCopy={giftsCopy}
          />
        ) : (
          <AuthGatedPage
            state={state.kind}
            copy={readingsCopy}
            magicLinkNext="/my-readings"
            resendHref="/my-readings"
          />
        )}
        <Footer />
      </main>
    </div>
  );
}

function LibraryListView({
  readings,
  gifts,
  readingsCopy,
  giftsCopy,
}: {
  readings: SubmissionRecord[];
  gifts: SubmissionRecord[];
  readingsCopy: MyReadingsPageContent;
  giftsCopy: MyGiftsPageContent;
}) {
  return (
    <>
      <header className="text-center">
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {readingsCopy.listHeading}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {readingsCopy.listSubheading}
        </p>
      </header>
      <GoldDivider className="max-w-xs mx-auto my-12" />

      <section aria-labelledby="library-mine-heading">
        <h2
          id="library-mine-heading"
          className="font-display italic text-2xl text-j-text-heading"
        >
          {readingsCopy.readingsTabLabel}
        </h2>
        <div className="mt-8">
          {readings.length === 0 ? (
            <ReadingsEmptyState copy={readingsCopy} />
          ) : (
            <ReadingsCards readings={readings} copy={readingsCopy} />
          )}
        </div>
      </section>

      <GoldDivider className="max-w-xs mx-auto my-16" />

      <section aria-labelledby="library-for-others-heading">
        <h2
          id="library-for-others-heading"
          className="font-display italic text-2xl text-j-text-heading"
        >
          {readingsCopy.giftsTabLabel}
        </h2>
        <div className="mt-8">
          {gifts.length === 0 ? (
            <GiftsEmptyState copy={giftsCopy} />
          ) : (
            <GiftsCards gifts={gifts} copy={giftsCopy} />
          )}
        </div>
      </section>
    </>
  );
}

function ReadingsCards({
  readings,
  copy,
}: {
  readings: SubmissionRecord[];
  copy: MyReadingsPageContent;
}) {
  return (
    <ul className="space-y-6">
      {readings.map((reading) => {
        const deliveredAtMs = reading.deliveredAt
          ? Date.parse(reading.deliveredAt)
          : null;
        const expired = isReadingExpired(deliveredAtMs);
        return (
          <li
            key={reading._id}
            className="border border-j-blush rounded-2xl bg-j-ivory px-5 py-5 sm:px-8 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4"
          >
            <div>
              <h3 className="font-display italic text-xl text-j-text-heading">
                {reading.reading?.name ?? "Your reading"}
              </h3>
              <p className="font-body text-sm text-j-text-muted mt-1">
                {expired
                  ? copy.expiredRowLabel
                  : `Delivered ${formatDate(reading.deliveredAt ?? reading.createdAt)}`}
              </p>
            </div>
            {expired ? (
              <a
                href={expiredMailtoHref(copy.expiredMailtoSubject, reading._id)}
                className="font-display italic text-base text-j-text-muted underline whitespace-nowrap self-start sm:self-auto"
              >
                {copy.expiredMailtoLabel}
              </a>
            ) : (
              <Button href={`/listen/${reading._id}`} className="self-start sm:self-auto">
                {copy.openButtonLabel}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ReadingsEmptyState({ copy }: { copy: MyReadingsPageContent }) {
  return (
    <div className="text-center">
      <p className="font-display italic text-lg text-j-text mt-8 max-w-md mx-auto">
        {copy.emptyHeading}
      </p>
      <div className="mt-10">
        <Button href="/book" size="lg">
          {copy.emptyCtaLabel}
        </Button>
      </div>
    </div>
  );
}

function GiftsCards({
  gifts,
  copy,
}: {
  gifts: SubmissionRecord[];
  copy: MyGiftsPageContent;
}) {
  return (
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
  );
}

function GiftCard({
  gift,
  copy,
}: {
  gift: SubmissionRecord;
  copy: MyGiftsPageContent;
}) {
  const status = giftStatusFor(gift);
  const recipientName = recipientLabelFor(gift);
  const recipientEmail = gift.recipientEmail;
  const showsEmailUnderName =
    recipientEmail && recipientEmail.toLowerCase() !== recipientName.toLowerCase();
  return (
    <li className="border border-j-blush rounded-2xl bg-j-ivory px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="font-display italic text-xl text-j-text-heading">
            {gift.reading?.name ?? "A reading"}
            <span className="font-display italic text-j-text-muted"> · for {recipientName}</span>
          </h3>
          {showsEmailUnderName ? (
            <p className="font-body text-xs text-j-text-muted mt-0.5">{recipientEmail}</p>
          ) : null}
          <GiftStatusPill status={status} copy={copy} className="mt-2" />
        </div>
        <GiftCardActions gift={toGiftCardData(gift)} status={status} copy={copy} />
      </div>
    </li>
  );
}

function GiftsEmptyState({ copy }: { copy: MyGiftsPageContent }) {
  return (
    <div className="text-center">
      <h3 className="font-display italic text-2xl text-j-text-heading">{copy.emptyHeading}</h3>
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

function expiredMailtoHref(subject: string, submissionId: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const body = encodeURIComponent(`Reading ID: ${submissionId}`);
  return `mailto:${CONTACT_EMAIL}?subject=${encodedSubject}&body=${body}`;
}

function formatDate(iso: string): string {
  return format(parseISO(iso), "MMMM d, yyyy");
}
