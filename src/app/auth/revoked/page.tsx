import type { Metadata } from "next";

import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Sessions revoked, with Josephine",
  description: "Your reading sessions have been signed out from every device.",
  robots: { index: false, follow: false },
};

export default function RevokedPage() {
  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="relative z-10 flex flex-col items-center max-w-xl">
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
          Signed out everywhere
        </span>
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-light italic text-j-text-heading leading-tight">
          Your reading is locked down
        </h1>
        <p className="font-display text-lg italic text-j-text-muted mt-4">
          I have signed you out of every device on this reading. If you opened it, you will need to ask for a fresh link the next time you want to come back in.
        </p>
        <p className="font-body text-base text-j-text-body mt-6">
          I will also be in touch by email to make sure everything is OK. If you would like to write first, hello@withjosephine.com comes straight to me.
        </p>
        <div className="mt-10">
          <Button href="/" variant="primary" size="lg">
            Return home
          </Button>
        </div>
      </div>
    </div>
  );
}
