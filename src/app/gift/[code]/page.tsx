import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingFormView } from "@/app/book/[readingId]/BookingFormView";
import { loadReadingPageMetadata } from "@/app/book/[readingId]/readingPageMetadata";
import { EntryPageView } from "@/components/BookingAnalytics";
import { BookingEntryProvider } from "@/lib/intake/bookingEntryContext";
import { loadNotesNav } from "@/lib/notes/loadNotesNav";
import { SITE_NAME } from "@/lib/seoMetadata";

import { deriveGiftMessageViewProps } from "./deriveGiftMessageViewProps";
import { GiftMessageView } from "./GiftMessageView";
import {
  loadGiftBookingFormViewProps,
  loadGiftContent,
  loadMessageReading,
} from "./loadGiftPageProps";
import { type GiftPageState, resolveGiftRequest } from "./resolveGiftRequest";

export const dynamic = "force-dynamic";

const NOINDEX: Metadata["robots"] = { index: false, follow: false };

type GiftPageProps = {
  params: Promise<{ code: string }>;
};

type FormState = Extract<GiftPageState, { kind: "form" }>;
type MessageState = Extract<GiftPageState, { kind: "message" }>;

export async function generateMetadata({ params }: GiftPageProps): Promise<Metadata> {
  const { code } = await params;
  const state = await resolveGiftRequest(code);
  if (state.kind === "message") return { title: SITE_NAME, robots: NOINDEX };
  return { ...(await loadReadingPageMetadata(state.gift.readingSlug)), robots: NOINDEX };
}

async function renderGiftMessage({ message, readingSlug }: MessageState) {
  const [copy, reading, nav] = await Promise.all([
    loadGiftContent("published"),
    loadMessageReading(readingSlug, "published"),
    loadNotesNav(),
  ]);
  return <GiftMessageView {...deriveGiftMessageViewProps(message, reading, copy, nav)} />;
}

async function renderGiftBookingForm({ gift }: FormState) {
  const props = await loadGiftBookingFormViewProps(gift, "published");
  if (!props) notFound();

  return (
    <BookingEntryProvider key={props.reading.slug} readingId={props.reading.slug} entry="gift">
      <BookingFormView {...props} />
      <EntryPageView readingId={props.reading.slug} />
    </BookingEntryProvider>
  );
}

export default async function GiftPage({ params }: GiftPageProps) {
  const { code } = await params;
  const state = await resolveGiftRequest(code);
  return state.kind === "message" ? renderGiftMessage(state) : renderGiftBookingForm(state);
}
