import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Footer } from "@/components/Footer";
import { verifyGiftClaimToken } from "@/lib/booking/giftClaim";
import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Claim your gift — Josephine",
  description: "Open the reading someone sent you.",
  robots: { index: false, follow: false },
};

type GiftClaimPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function GiftClaimPage({ searchParams }: GiftClaimPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="relative min-h-screen bg-j-cream overflow-hidden">
        <main className="relative z-10 max-w-xl mx-auto px-6 py-24 text-center">
          <span aria-hidden="true" className="block text-j-accent text-xl mb-3">
            ✦
          </span>
          <h1 className="font-display italic font-medium text-3xl text-j-text-heading mb-3">
            Open from your email
          </h1>
          <p className="font-body text-base text-j-text leading-relaxed">
            Your gift link came in an email — open it from there to claim your
            reading.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const submission = await verifyGiftClaimToken(token);
  if (!submission) {
    return (
      <div className="relative min-h-screen bg-j-cream overflow-hidden">
        <main className="relative z-10 max-w-xl mx-auto px-6 py-24 text-center">
          <span aria-hidden="true" className="block text-j-accent text-xl mb-3">
            ✦
          </span>
          <h1 className="font-display italic font-medium text-3xl text-j-text-heading mb-3">
            This gift has already been opened
          </h1>
          <p className="font-body text-base text-j-text leading-relaxed">
            If you think this is a mistake, reply to the email your gift came in
            and we&apos;ll help.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  await setGiftClaimCookie(submission._id);
  redirect(`/gift/intake?welcome=1`);
}
