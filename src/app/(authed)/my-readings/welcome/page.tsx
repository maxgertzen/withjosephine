import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { fetchMyReadingsPage } from "@/lib/sanity/fetch";
import { pickDefined } from "@/lib/sanity/pickDefined";

export const metadata: Metadata = {
  title: "Welcome to your library | Josephine",
  description: "Continue to your reading library.",
  robots: { index: false, follow: false },
};

/**
 * Server-rendered interstitial shown when a one-tap library token is present
 * in `/my-readings/welcome?t=<token>`. Pure HTML form (no client JS).
 * Submitting POSTs the token in the body (not the URL) to
 * /api/library/redeem, which mints the listen session cookie and 303-redirects
 * to /my-readings?welcome=1.
 *
 * Idempotent on GET: prefetchers and link-scanners never consume the
 * redemption because the actual ledger insert happens only on POST.
 *
 * Bare URL with no `?t=` param: 302 redirect to /my-readings (graceful
 * fallback for anyone landing on the welcome path without a token).
 */
export default async function MyReadingsWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const params = await searchParams;
  const token = params.t;
  // Library tokens are ~150-200 chars in practice; cap at 1024 to defang
  // pathological URLs without losing a real token.
  if (!token || token.length > 1024) {
    redirect("/my-readings");
  }

  const sanity = await fetchMyReadingsPage().catch(() => null);
  const copy = { ...MY_READINGS_PAGE_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const heading = copy.welcomeHeading ?? MY_READINGS_PAGE_DEFAULTS.welcomeHeading!;
  const subhead = copy.welcomeSubhead ?? MY_READINGS_PAGE_DEFAULTS.welcomeSubhead!;
  const buttonLabel = copy.welcomeButtonLabel ?? MY_READINGS_PAGE_DEFAULTS.welcomeButtonLabel!;

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
          <h1 className="font-display italic text-3xl text-j-text-heading">{heading}</h1>
          <GoldDivider className="max-w-xs mx-auto my-8" />
          <p className="font-body text-base text-j-text leading-[1.6]">{subhead}</p>
          <form
            method="POST"
            action="/api/library/redeem"
            encType="application/x-www-form-urlencoded"
            className="mt-8"
          >
            <input type="hidden" name="t" value={token} />
            <Button type="submit" size="lg" className="w-full">
              {buttonLabel}
            </Button>
          </form>
        </div>
        <Footer />
      </main>
    </div>
  );
}
