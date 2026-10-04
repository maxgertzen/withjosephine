import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";

import { deriveGiftThankYouViewProps } from "@/app/(authed)/thank-you/[readingId]/deriveGiftThankYouViewProps";
import { GiftThankYouView } from "@/app/(authed)/thank-you/[readingId]/GiftThankYouView";
import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";
import { BookingPreviewUnavailable } from "@/app/preview/book/[slug]/BookingPreviewUnavailable";
import { loadPreviewBookingFormProps } from "@/app/preview/book/[slug]/loadPreviewBookingFormProps";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import { giftContent } from "@/lib/gift/giftContent";
import {
  GIFT_PREVIEW_STATES,
  type GiftPreviewState,
} from "@/lib/page-previews/preview-fixtures-pages";
import { fetchGiftSettings, fetchReading } from "@/lib/sanity/fetch";

import { OpenGiftSheet } from "./OpenGiftSheet";

export const metadata: Metadata = {
  title: "Preview: Gift Pages",
  robots: { index: false, follow: false },
};

type GiftPreviewProps = {
  params: Promise<{ state: string }>;
};

async function renderBuySheet(): Promise<ReactElement> {
  const slug = PREVIEW_GIFT.readingSlug;
  const [props, giftSettings] = await Promise.all([
    loadPreviewBookingFormProps(slug),
    fetchGiftSettings(),
  ]);
  if (!props) return <BookingPreviewUnavailable slug={slug} />;

  return (
    <>
      <BookingFormView {...props} />
      <OpenGiftSheet
        reading={{ slug: props.reading.slug, name: props.reading.name, price: props.reading.priceLabel }}
        content={giftContent(giftSettings)}
        paymentButtonText={props.form.submitLabel}
        loadingStateCopy={props.form.loadingStateCopy}
        endpoint={null}
      />
    </>
  );
}

async function renderBuyerThankYou(): Promise<ReactElement> {
  const [sanityReading, giftSettings] = await Promise.all([
    fetchReading(PREVIEW_GIFT.readingSlug),
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
    },
    readingName: sanityReading?.name ?? PREVIEW_GIFT.readingName,
    giftSettings,
  });

  return <GiftThankYouView {...props} />;
}

const GIFT_PREVIEWS: Record<GiftPreviewState, () => Promise<ReactElement>> = {
  "buy-sheet": renderBuySheet,
  "buyer-thank-you": renderBuyerThankYou,
};

function isGiftPreviewState(state: string): state is GiftPreviewState {
  return GIFT_PREVIEW_STATES.some((entry) => entry.state === state);
}

export default async function GiftPagePreview({ params }: GiftPreviewProps) {
  const { state } = await params;
  if (!isGiftPreviewState(state)) notFound();
  return GIFT_PREVIEWS[state]();
}
