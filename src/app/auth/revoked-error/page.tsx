import type { Metadata } from "next";

import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Link expired, with Josephine",
  description: "This revoke link is no longer valid.",
  robots: { index: false, follow: false },
};

export default function RevokedErrorPage() {
  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center">
      <div className="relative z-10 flex flex-col items-center max-w-xl">
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
          This link rested
        </span>
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-light italic text-j-text-heading leading-tight">
          This link is no longer valid
        </h1>
        <p className="font-display text-lg italic text-j-text-muted mt-4">
          The link in the new-device email expires after fifteen minutes. If you still want to sign out of your reading on every device, write to me at hello@withjosephine.com and I will take care of it.
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
