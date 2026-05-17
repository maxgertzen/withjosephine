import type { Metadata } from "next";

import { MagicLinkEmailForm } from "@/components/Auth/MagicLinkEmailForm";
import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { StarField } from "@/components/StarField";
import {
  MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
  type MagicLinkVerifyPageContent,
} from "@/data/defaults";
import { safeNext } from "@/lib/auth/safeNext";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { fetchMagicLinkVerifyPage } from "@/lib/sanity/fetch";

export const metadata: Metadata = {
  title: "Open your reading — Josephine",
  description: "Confirm your email to open your reading.",
  robots: { index: false, follow: false },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; next?: string; error?: string }>;
}) {
  const [params, sanity] = await Promise.all([searchParams, fetchMagicLinkVerifyPage().catch(() => null)]);
  const copy = { ...MAGIC_LINK_VERIFY_PAGE_DEFAULTS, ...(sanity ?? {}) };
  const token = params.token ?? "";
  const next = safeNext(params.next);
  const showRested = params.error === "rested" || !token;

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        {showRested ? <RestedLinkCard copy={copy} /> : <ConfirmEmailCard copy={copy} token={token} next={next} />}
        <Footer />
      </main>
    </div>
  );
}

function ConfirmEmailCard({
  copy,
  token,
  next,
}: {
  copy: MagicLinkVerifyPageContent;
  token: string;
  next: string;
}) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10">
      <h1 className="font-display italic text-3xl text-j-text-heading text-center">
        {copy.confirmHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 text-center leading-[1.6]">
        {copy.confirmBody}
      </p>
      <MagicLinkEmailForm
        action="/api/auth/magic-link/verify"
        submitLabel={copy.confirmButtonLabel}
        emailLabel={copy.confirmEmailLabel}
        hiddenFields={{ token, next }}
      />
      <p className="font-display italic text-base text-j-text-muted mt-8 text-center">
        {copy.confirmFootnote}
      </p>
    </div>
  );
}

function RestedLinkCard({ copy }: { copy: MagicLinkVerifyPageContent }) {
  return (
    <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
      <h1 className="font-display italic text-3xl text-j-text-heading">
        {copy.restedHeading}
      </h1>
      <p className="font-body text-base text-j-text mt-4 leading-[1.6]">
        {copy.restedBody}
      </p>
      <div className="mt-8">
        <Button href="/my-readings" size="lg">
          {copy.restedCtaLabel}
        </Button>
      </div>
    </div>
  );
}
