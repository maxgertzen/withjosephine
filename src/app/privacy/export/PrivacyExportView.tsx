"use client";

import { Download, MailCheck, ShieldAlert } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { TurnstileGate } from "@/components/TurnstileGate";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { errorClasses } from "@/lib/formStyles";
import { PRIVACY_EXPORT_API_ROUTE } from "@/lib/http/routes";

type Status = "idle" | "loading" | "success" | "error";

export type PrivacyExportViewProps = {
  token: string | null;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}
      <main className="relative z-10 max-w-[640px] mx-auto px-6 py-20 text-center">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export function PrivacyExportView({ token }: PrivacyExportViewProps) {
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const turnstileRequired = Boolean(turnstileSiteKey);

  if (!token) {
    return (
      <Shell>
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
          <ShieldAlert className="w-9 h-9 text-j-accent" strokeWidth={1.5} />
        </div>
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          This link isn&rsquo;t valid
        </h1>
        <p className="font-body text-base text-j-text-muted mt-4 max-w-md mx-auto">
          Please open the &ldquo;Request my data export&rdquo; link from your order
          confirmation email. If you need help, write to{" "}
          <a
            href="mailto:hello@withjosephine.com"
            className="font-display italic text-j-text-heading border-b border-j-border-gold hover:border-j-accent transition-colors"
          >
            hello@withjosephine.com
          </a>
          .
        </p>
      </Shell>
    );
  }

  if (status === "success") {
    return (
      <Shell>
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
          <MailCheck className="w-9 h-9 text-j-accent" strokeWidth={1.5} />
        </div>
        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          Your export is on its way
        </h1>
        <p className="font-body text-base text-j-text-muted mt-4 max-w-md mx-auto">
          We&rsquo;re preparing your data and will email a secure download link to the
          address on your order. It should arrive within a few minutes.
        </p>
      </Shell>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (turnstileRequired && !turnstileToken) {
      setErrorMessage("Please complete the verification check.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch(PRIVACY_EXPORT_API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, turnstileToken }),
      });

      if (response.status === 202) {
        setStatus("success");
        return;
      }

      setStatus("error");
      if (response.status === 429) {
        setErrorMessage(
          "You’ve already requested this export recently. Please check your email.",
        );
      } else if (response.status === 410) {
        setErrorMessage(
          "There’s no data left to export for this order. If this seems wrong, write to hello@withjosephine.com.",
        );
      } else if (response.status === 403 || response.status === 400) {
        setErrorMessage(
          "This link is no longer valid. Please use the most recent link from your email.",
        );
      } else {
        setErrorMessage("Something went wrong. Please try again in a moment.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Could not reach the server. Please try again later.");
    }
  }

  const isLoading = status === "loading";

  return (
    <Shell>
      <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
        <Download className="w-9 h-9 text-j-accent" strokeWidth={1.5} />
      </div>

      <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
        Request your data export
      </h1>
      <p className="font-body text-base text-j-text-muted mt-4 max-w-md mx-auto">
        Download everything we hold for this reading, your intake answers, consent
        records, and payment details. It&rsquo;s your right under GDPR.
      </p>

      <GoldDivider className="max-w-xs mx-auto my-12" />

      <p className="font-body text-sm text-j-text-muted max-w-md mx-auto mb-8">
        For your security, we&rsquo;ll email the download link to the address on your
        order, not to this page.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6">
        <TurnstileGate siteKey={turnstileSiteKey} onToken={setTurnstileToken} />

        {errorMessage && (
          <p role="alert" className={`${errorClasses} text-center max-w-md`}>
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={isLoading || (turnstileRequired && !turnstileToken)}
        >
          {isLoading ? "Sending…" : "Request my data export"}
        </Button>
      </form>
    </Shell>
  );
}
