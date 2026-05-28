import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import type { ListenInterstitialContent } from "@/data/defaults";
import { PAGE_ORBS } from "@/lib/celestialPresets";

/**
 * Server-rendered interstitial shown when a valid one-tap token is present
 * in `/listen/[id]?t=<token>`. Pure HTML form (no client JS). Submitting the
 * form POSTs the token in the body (not the URL) to /api/listen/[id]/redeem,
 * which mints the session cookie and 303-redirects back to the page in
 * "welcome" mode.
 *
 * Idempotent on GET: prefetchers and link-scanners never consume the
 * redemption because the actual ledger insert happens only on POST.
 */
export type ListenTokenInterstitialProps = {
  submissionId: string;
  token: string;
  copy: ListenInterstitialContent;
};

export function ListenTokenInterstitial({
  submissionId,
  token,
  copy,
}: ListenTokenInterstitialProps) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20">
        <div className="max-w-md mx-auto bg-j-ivory border border-j-blush rounded-2xl p-10 text-center">
          <h1 className="font-display italic text-3xl text-j-text-heading">{copy.heading}</h1>
          <GoldDivider className="max-w-xs mx-auto my-8" />
          <p className="font-body text-base text-j-text leading-[1.6]">{copy.subhead}</p>
          <form
            method="POST"
            action={`/api/listen/${submissionId}/redeem`}
            encType="application/x-www-form-urlencoded"
            className="mt-8"
          >
            <input type="hidden" name="t" value={token} />
            <Button type="submit" size="lg" className="w-full">
              {copy.buttonLabel}
            </Button>
          </form>
        </div>
        <Footer />
      </main>
    </div>
  );
}
