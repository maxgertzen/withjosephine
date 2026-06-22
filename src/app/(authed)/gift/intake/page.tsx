import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { GIFT_INTAKE_PAGE_DEFAULTS } from "@/data/defaults";
import {
  GIFT_CLAIM_COOKIE,
  verifyGiftClaimCookie,
} from "@/lib/booking/giftClaimSession";
import { findSubmissionById } from "@/lib/booking/submissions";
import {
  fetchBookingForm,
  fetchGiftIntakePage,
  fetchReading,
} from "@/lib/sanity/fetch";

import { deriveGiftIntakeViewProps } from "./deriveGiftIntakeViewProps";
import { GiftIntakeView } from "./GiftIntakeView";

export async function generateMetadata(): Promise<Metadata> {
  const copy = (await fetchGiftIntakePage()) ?? GIFT_INTAKE_PAGE_DEFAULTS;
  return {
    title: copy.seoTitle,
    description: copy.seoDescription,
    robots: { index: false, follow: false },
  };
}

type GiftIntakePageProps = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function GiftIntakePage({ searchParams }: GiftIntakePageProps) {
  const { welcome } = await searchParams;

  const jar = await cookies();
  const cookieValue = jar.get(GIFT_CLAIM_COOKIE)?.value ?? null;
  const submissionId = await verifyGiftClaimCookie(cookieValue);

  if (!submissionId) {
    // Cookie expired mid-intake or recipient navigated directly. The original
    // email link is still valid until the gift is claimed — surface that
    // explicitly via ?expired=1 so /gift/claim renders the warmer "rested
    // link" copy instead of the generic no-token message.
    redirect("/gift/claim?expired=1");
  }

  // Sanity copy doesn't depend on the submission lookup; start it in parallel.
  const bookingFormPromise = fetchBookingForm();
  const intakePagePromise = fetchGiftIntakePage();

  const submission = await findSubmissionById(submissionId);
  if (!submission || !submission.isGift) {
    notFound();
  }
  if (submission.giftClaimedAt) {
    redirect("/gift/already-submitted");
  }

  const [reading, bookingForm, intakePageCopy] = await Promise.all([
    fetchReading(submission.reading?.slug ?? ""),
    bookingFormPromise,
    intakePagePromise,
  ]);

  if (!reading || !bookingForm) {
    notFound();
  }

  const props = deriveGiftIntakeViewProps({
    submission,
    reading,
    bookingForm,
    intakePageCopy,
    welcome: Boolean(welcome),
  });

  return <GiftIntakeView {...props} />;
}
