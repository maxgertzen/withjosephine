import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { deriveGiftThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/deriveGiftThankYouViewProps";
import { GiftThankYouView } from "@/app/(authed)/thank-you/[readingId]/GiftThankYouView";
import { loadRecipientThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/loadRecipientThankYouViewProps";
import { ThankYouView } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";
import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";
import { deriveGiftMessageViewProps } from "@/app/gift/[code]/deriveGiftMessageViewProps";
import { GiftMessageView } from "@/app/gift/[code]/GiftMessageView";
import {
  loadGiftBookingFormViewProps,
  loadGiftContent,
  loadMessageReading,
} from "@/app/gift/[code]/loadGiftPageProps";
import type { GiftPageMessage } from "@/app/gift/[code]/resolveGiftRequest";
import { GIFT_SEND_PAGE_COPY_KEYS, GiftSendPageView } from "@/app/gift/send/GiftSendPageView";
import { BookingPreviewUnavailable } from "@/app/preview/book/[slug]/BookingPreviewUnavailable";
import { loadPreviewBookingFormProps } from "@/app/preview/book/[slug]/loadPreviewBookingFormProps";
import type { GiftFoldSheet } from "@/components/GiftFold";
import { SiteNavigation } from "@/components/Navigation/SiteNavigation";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import { BookingEntryProvider } from "@/lib/intake/bookingEntryContext";
import type { InitialPage } from "@/lib/intake/useDraftRestore";
import { loadNotesNav } from "@/lib/notes/loadNotesNav";
import {
  GIFT_PREVIEW_STATES,
  type GiftPreviewState,
} from "@/lib/page-previews/preview-fixtures-pages";
import { pick } from "@/lib/pick";
import { fetchGiftSettings, fetchReading } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Preview: Gift Pages",
  robots: { index: false, follow: false },
};

const SLUG = PREVIEW_GIFT.readingSlug;
const UNREDEEMABLE_PREVIEW_CODE = "K7M2QX9PH4TU";

type GiftPreviewProps = {
  params: Promise<{ state: string }>;
};

async function renderBookingFormWithSheet(initialSheet: GiftFoldSheet): Promise<ReactElement> {
  const props = await loadPreviewBookingFormProps(SLUG, initialSheet);
  if (!props) return <BookingPreviewUnavailable slug={SLUG} />;
  return <BookingFormView {...props} />;
}

async function renderBuyerThankYou(): Promise<ReactElement> {
  const [sanityReading, giftSettings] = await Promise.all([
    fetchReading(SLUG),
    fetchGiftSettings(),
  ]);

  const props = deriveGiftThankYouViewProps({
    gift: {
      kind: "active",
      buyerFirstName: PREVIEW_GIFT.buyerFirstName,
      note: PREVIEW_GIFT.note,
      displayCode: PREVIEW_GIFT.code,
      giftUrl: PREVIEW_GIFT.giftUrl,
      sendToken: null,
      sendStatus: {
        state: "ready",
        buyerName: PREVIEW_GIFT.buyerFirstName,
        hasNote: true,
        recipientName: null,
      },
    },
    readingName: sanityReading?.name ?? PREVIEW_GIFT.readingName,
    giftSettings,
  });

  return (
    <>
      <SiteNavigation perspective="preview" />
      <GiftThankYouView {...props} />
    </>
  );
}

async function renderRecipientThankYou(): Promise<ReactElement> {
  const props = await loadRecipientThankYouViewProps(
    Promise.resolve({
      readingSlug: SLUG,
      readingName: null,
      recipientFirstName: PREVIEW_GIFT.recipientFirstName,
      buyerFirstName: PREVIEW_GIFT.buyerFirstName,
    }),
  );
  return (
    <>
      <SiteNavigation perspective="preview" />
      <ThankYouView {...props} />
    </>
  );
}

async function renderGiftForm({
  note,
  initialPage,
}: {
  note: string | null;
  initialPage?: InitialPage;
}): Promise<ReactElement> {
  const props = await loadGiftBookingFormViewProps(
    {
      code: UNREDEEMABLE_PREVIEW_CODE,
      buyerFirstName: PREVIEW_GIFT.buyerFirstName,
      note,
      readingSlug: SLUG,
    },
    "preview",
  );
  if (!props) return <BookingPreviewUnavailable slug={SLUG} />;

  return (
    <BookingEntryProvider readingId={SLUG} entry="gift">
      <BookingFormView {...props} form={{ ...props.form, initialPage, preview: true }} />
    </BookingEntryProvider>
  );
}

async function renderGiftMessage(
  message: GiftPageMessage,
  withReading: boolean,
): Promise<ReactElement> {
  const [copy, reading, nav] = await Promise.all([
    loadGiftContent("preview"),
    loadMessageReading(withReading ? SLUG : null, "preview"),
    loadNotesNav("preview"),
  ]);
  return <GiftMessageView {...deriveGiftMessageViewProps(message, reading, copy, nav)} />;
}

async function renderSendPage(): Promise<ReactElement> {
  return (
    <>
      <SiteNavigation perspective="preview" />
      <GiftSendPageView
        copy={pick(await loadGiftContent("preview"), GIFT_SEND_PAGE_COPY_KEYS)}
        status={{
          state: "ready",
          buyerName: PREVIEW_GIFT.buyerFirstName,
          hasNote: true,
          recipientName: null,
        }}
        token=""
        disabled
      />
    </>
  );
}

const GIFT_PREVIEWS: Record<GiftPreviewState, () => Promise<ReactElement>> = {
  "buy-sheet": () => renderBookingFormWithSheet("gift"),
  "buyer-thank-you": renderBuyerThankYou,
  "redeem-sheet": () => renderBookingFormWithSheet("redeem"),
  opened: () => renderGiftForm({ note: PREVIEW_GIFT.note }),
  "opened-no-note": () => renderGiftForm({ note: null }),
  "already-opened": () => renderGiftMessage("already_opened", true),
  "no-longer-active": () => renderGiftMessage("no_longer_active", true),
  "not-found": () => renderGiftMessage("not_found", false),
  "last-page": () => renderGiftForm({ note: PREVIEW_GIFT.note, initialPage: "last" }),
  "recipient-thank-you": renderRecipientThankYou,
  "send-link": renderSendPage,
};

function isGiftPreviewState(state: string): state is GiftPreviewState {
  return GIFT_PREVIEW_STATES.some((entry) => entry.state === state);
}

export default async function GiftPagePreview({ params }: GiftPreviewProps) {
  const { state } = await params;
  if (!isGiftPreviewState(state)) notFound();
  return GIFT_PREVIEWS[state]();
}
