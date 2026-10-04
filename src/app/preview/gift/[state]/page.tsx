import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { deriveGiftThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/deriveGiftThankYouViewProps";
import { GiftThankYouView } from "@/app/(authed)/thank-you/[readingId]/GiftThankYouView";
import { loadRecipientThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/loadRecipientThankYouViewProps";
import { ThankYouView } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";
import { BookingFormView, type BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
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
import { GiftSheet } from "@/components/GiftSheet";
import { RedeemSheet } from "@/components/RedeemSheet";
import type { GiftContent } from "@/data/defaults";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import { BookingEntryProvider } from "@/lib/intake/bookingEntryContext";
import type { InitialPage } from "@/lib/intake/useDraftRestore";
import {
  GIFT_PREVIEW_STATES,
  type GiftPreviewState,
} from "@/lib/page-previews/preview-fixtures-pages";
import { pick } from "@/lib/pick";
import { fetchGiftSettings, fetchReading } from "@/lib/sanity/fetch";

import { OpenSheetPreview } from "./OpenSheetPreview";

export const metadata: Metadata = {
  title: "Preview: Gift Pages",
  robots: { index: false, follow: false },
};

const SLUG = PREVIEW_GIFT.readingSlug;
const UNREDEEMABLE_PREVIEW_CODE = "K7M2QX9PH4TU";

type GiftPreviewProps = {
  params: Promise<{ state: string }>;
};

async function renderBookingFormWithSheet(
  renderSheet: (props: BookingFormViewProps, copy: GiftContent) => ReactElement,
): Promise<ReactElement> {
  const [props, copy] = await Promise.all([
    loadPreviewBookingFormProps(SLUG),
    loadGiftContent("preview"),
  ]);
  if (!props) return <BookingPreviewUnavailable slug={SLUG} />;

  return (
    <>
      <BookingFormView {...props} />
      {renderSheet(props, copy)}
    </>
  );
}

function renderBuySheet(): Promise<ReactElement> {
  return renderBookingFormWithSheet((props, copy) => (
    <OpenSheetPreview
      sheet={GiftSheet}
      props={{
        reading: {
          slug: props.reading.slug,
          name: props.reading.name,
          price: props.reading.priceLabel,
        },
        content: copy,
        paymentButtonText: props.form.submitLabel,
        loadingStateCopy: props.form.loadingStateCopy,
        endpoint: null,
      }}
    />
  ));
}

function renderRedeemSheet(): Promise<ReactElement> {
  return renderBookingFormWithSheet((_props, copy) => (
    <OpenSheetPreview
      sheet={RedeemSheet}
      props={{ readingSlug: SLUG, content: copy, endpoint: null }}
    />
  ));
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

  return <GiftThankYouView {...props} />;
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
  return <ThankYouView {...props} />;
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
  const [copy, reading] = await Promise.all([
    loadGiftContent("preview"),
    loadMessageReading(withReading ? SLUG : null, "preview"),
  ]);
  return <GiftMessageView {...deriveGiftMessageViewProps(message, reading, copy)} />;
}

async function renderSendPage(): Promise<ReactElement> {
  return (
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
  );
}

const GIFT_PREVIEWS: Record<GiftPreviewState, () => Promise<ReactElement>> = {
  "buy-sheet": renderBuySheet,
  "buyer-thank-you": renderBuyerThankYou,
  "redeem-sheet": renderRedeemSheet,
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
