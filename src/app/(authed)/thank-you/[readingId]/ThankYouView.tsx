"use client";

import { Mail } from "lucide-react";

import { Button } from "@/components/Button";
import { CelestialOrb } from "@/components/CelestialOrb";
import { Footer } from "@/components/Footer";
import { GoldDivider } from "@/components/GoldDivider";
import { StarField } from "@/components/StarField";
import { ThankYouGuard } from "@/components/ThankYouGuard";
import { PAGE_ORBS } from "@/lib/celestialPresets";
import { renderWithSlots } from "@/lib/copy/templateSlots";

export type ThankYouMode = "purchase" | "giftPurchaser" | "giftRecipient";

export type ThankYouViewCopy = {
  heading: string;
  subheading: string;
  readingLabel: string;
  confirmationBody: string;
  timelineBody: string;
  contactBody: string;
  closingMessage: string;
  returnButtonText: string;
  deliveryDaysPhrase: string;
};

export type ThankYouViewProps = {
  mode: ThankYouMode;
  reading: { name: string; price: string; cents: number | null };
  paidAmount: { cents: number | null; display: string | null };
  purchaserFirstName: string | null;
  recipientName: string | null;
  contactEmail: string;
  copy: ThankYouViewCopy;
};

export function ThankYouView({
  mode,
  reading,
  paidAmount,
  purchaserFirstName,
  recipientName,
  contactEmail,
  copy,
}: ThankYouViewProps) {
  const purchaserSlotValue = purchaserFirstName ?? "";
  const recipientSlotValue = recipientName ?? "";
  const isRecipient = mode === "giftRecipient";
  const showsPurchaserOnlySections = !isRecipient;
  const showsDiscountedPrice =
    paidAmount.cents !== null && reading.cents !== null && paidAmount.cents < reading.cents;

  return (
    <div className="relative min-h-screen bg-j-cream overflow-hidden">
      <ThankYouGuard />
      <StarField count={30} className="opacity-[0.03]" />
      {PAGE_ORBS.map((orb, index) => (
        <CelestialOrb key={index} {...orb} />
      ))}

      <main className="relative z-10 max-w-[720px] mx-auto px-6 py-20 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-j-accent/30 bg-j-accent/10">
          <Mail className="w-9 h-9 text-j-accent" strokeWidth={1.5} />
        </div>

        <h1 className="font-display italic text-[clamp(2rem,5vw,3rem)] font-medium text-j-text-heading leading-tight">
          {renderWithSlots(copy.heading, {
            purchaserFirstName: purchaserSlotValue,
            recipientName: recipientSlotValue,
          })}
        </h1>
        <p className="font-display italic text-lg text-j-text-muted mt-4 max-w-md mx-auto">
          {renderWithSlots(copy.subheading, {
            purchaserFirstName: purchaserSlotValue,
            recipientName: recipientSlotValue,
          })}
        </p>

        <div className="mt-10 bg-j-ivory border border-j-border-subtle rounded-[20px] p-6 shadow-j-soft inline-flex items-center gap-6">
          <div className="text-left">
            <span className="font-body text-xs tracking-[0.18em] uppercase text-j-text-muted">
              {copy.readingLabel}
            </span>
            <p className="font-display text-xl italic text-j-text-heading mt-1">{reading.name}</p>
          </div>
          {showsPurchaserOnlySections &&
            (showsDiscountedPrice ? (
              <span className="font-display text-2xl italic flex items-baseline gap-2">
                <span className="line-through text-j-text-muted text-lg">{reading.price}</span>
                <span className="text-j-accent">{paidAmount.display}</span>
              </span>
            ) : (
              <span className="font-display text-2xl italic text-j-accent">
                {paidAmount.display ?? reading.price}
              </span>
            ))}
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <div className="text-left max-w-prose mx-auto flex flex-col gap-5 font-body text-base text-j-text leading-relaxed">
          {showsPurchaserOnlySections && (
            <p className="whitespace-pre-line">
              {renderWithSlots(copy.confirmationBody, {
                purchaserFirstName: purchaserSlotValue,
                recipientName: recipientSlotValue,
              })}
            </p>
          )}
          <p className="whitespace-pre-line">
            {renderWithSlots(copy.timelineBody, {
              deliveryDays: (
                <span className="font-display italic text-j-accent">{copy.deliveryDaysPhrase}</span>
              ),
              recipientName: recipientSlotValue,
            })}
          </p>
          <p className="whitespace-pre-line">
            {renderWithSlots(copy.contactBody, {
              email: (
                <a
                  href={`mailto:${contactEmail}`}
                  className="font-display italic text-j-text-heading border-b border-j-border-gold hover:border-j-accent transition-colors"
                >
                  {contactEmail}
                </a>
              ),
            })}
          </p>
        </div>

        <GoldDivider className="max-w-xs mx-auto my-12" />

        <p className="font-display italic text-base text-j-text max-w-sm mx-auto whitespace-pre-line">
          {copy.closingMessage}
        </p>

        <div className="mt-10">
          <Button href="/" variant="ghost" size="lg">
            {copy.returnButtonText}
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
