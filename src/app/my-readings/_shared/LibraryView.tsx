"use client";

import { format, parseISO } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { GiftCardActions, type GiftCardData, type ResendVerdictSummary } from "@/app/my-gifts/GiftCardActions";
import { AuthGatedPage } from "@/components/AuthGatedPage/AuthGatedPage";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GiftStatusPill } from "@/components/GiftStatusPill";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { TabPanel } from "@/components/Tabs/TabPanel";
import { Tabs } from "@/components/Tabs/Tabs";
import type { MyGiftsPageContent, MyReadingsPageContent } from "@/data/defaults";
import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { recipientLabelFor } from "@/lib/booking/giftPersonas";
import { giftResendRateLimit, giftStatusFor } from "@/lib/booking/giftStatus";
import { isReadingExpired } from "@/lib/booking/readingRetention";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SubmissionRecord } from "@/lib/page-previews/types";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export type LibraryTabId = "readings" | "gifts";

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
  defaultTab: LibraryTabId;
};

const READINGS_PATH = "/my-readings";
const GIFTS_PATH = "/my-readings/gifts";

function pathForTab(tab: LibraryTabId): string {
  return tab === "gifts" ? GIFTS_PATH : READINGS_PATH;
}

export function LibraryView({
  state,
  readingsCopy,
  giftsCopy,
  defaultTab,
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
            defaultTab={defaultTab}
          />
        ) : (
          <AuthGatedPage
            state={state.kind}
            copy={readingsCopy}
            magicLinkNext={pathForTab(defaultTab)}
            resendHref={pathForTab(defaultTab)}
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
  defaultTab,
}: {
  readings: SubmissionRecord[];
  gifts: SubmissionRecord[];
  readingsCopy: MyReadingsPageContent;
  giftsCopy: MyGiftsPageContent;
  defaultTab: LibraryTabId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<LibraryTabId>(defaultTab);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setActiveTab(pathname === GIFTS_PATH ? "gifts" : "readings");
  }

  function handleChange(nextId: string) {
    if (nextId !== "readings" && nextId !== "gifts") return;
    setActiveTab(nextId);
    const nextPath = pathForTab(nextId);
    if (nextPath !== pathname) {
      router.push(nextPath, { scroll: false });
    }
  }

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
      <Tabs
        tabs={[
          {
            id: "readings",
            label: readingsCopy.readingsTabLabel,
            count: readings.length,
          },
          {
            id: "gifts",
            label: readingsCopy.giftsTabLabel,
            count: gifts.length,
          },
        ]}
        activeTabId={activeTab}
        onChange={handleChange}
        label={readingsCopy.listHeading}
        className="mb-10"
      />
      <TabPanel tabId="readings" isActive={activeTab === "readings"}>
        {readings.length === 0 ? (
          <ReadingsEmptyState copy={readingsCopy} />
        ) : (
          <ReadingsCards readings={readings} copy={readingsCopy} />
        )}
      </TabPanel>
      <TabPanel tabId="gifts" isActive={activeTab === "gifts"}>
        {gifts.length === 0 ? (
          <GiftsEmptyState copy={giftsCopy} />
        ) : (
          <GiftsCards gifts={gifts} copy={giftsCopy} />
        )}
      </TabPanel>
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
            className="border border-j-blush rounded-2xl bg-j-ivory px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h2 className="font-display italic text-xl text-j-text-heading">
                {reading.reading?.name ?? "Your reading"}
              </h2>
              <p className="font-body text-sm text-j-text-muted mt-1">
                {expired
                  ? copy.expiredRowLabel
                  : `Delivered ${formatDate(reading.deliveredAt ?? reading.createdAt)}`}
              </p>
            </div>
            {expired ? (
              <a
                href={expiredMailtoHref(copy.expiredMailtoSubject, reading._id)}
                className="font-display italic text-base text-j-text-muted underline whitespace-nowrap"
              >
                {copy.expiredMailtoLabel}
              </a>
            ) : (
              <Button href={`/listen/${reading._id}`}>{copy.openButtonLabel}</Button>
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

function computeResendVerdict(gift: SubmissionRecord): ResendVerdictSummary | undefined {
  if (gift.giftDeliveryMethod !== GIFT_DELIVERY.selfSend) return undefined;
  const nowMs = Date.now();
  const verdict = giftResendRateLimit(gift.emailsFired, nowMs);
  if (verdict.allowed) return { allowed: true };
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

function toGiftCardData(gift: SubmissionRecord): GiftCardData {
  return {
    _id: gift._id,
    responses: gift.responses,
    recipientEmail: gift.recipientEmail,
    giftSendAt: gift.giftSendAt,
    resendVerdict: computeResendVerdict(gift),
  };
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
          <h2 className="font-display italic text-xl text-j-text-heading">
            {gift.reading?.name ?? "A reading"}
            <span className="font-display italic text-j-text-muted"> · for {recipientName}</span>
          </h2>
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

function expiredMailtoHref(subject: string, submissionId: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const body = encodeURIComponent(`Reading ID: ${submissionId}`);
  return `mailto:${CONTACT_EMAIL}?subject=${encodedSubject}&body=${body}`;
}

function formatDate(iso: string): string {
  return format(parseISO(iso), "MMMM d, yyyy");
}
