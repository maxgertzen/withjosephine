import { Mail } from "lucide-react";

import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { ThankYouShell } from "@/components/ThankYouShell";
import { renderWithSlots } from "@/lib/copy/templateSlots";

import { cardLabelClasses, cardSurfaceClasses } from "./CardSurface";

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
  reading: { name: string; price: string; cents: number | null };
  paidAmount: { cents: number | null; display: string | null };
  contactEmail: string;
  copy: ThankYouViewCopy;
};

export function ThankYouView({
  reading,
  paidAmount,
  contactEmail,
  copy,
}: ThankYouViewProps) {
  const showsDiscountedPrice =
    paidAmount.cents !== null && reading.cents !== null && paidAmount.cents < reading.cents;

  return (
    <ThankYouShell icon={Mail} heading={copy.heading} subheading={copy.subheading}>
      <div className={`mt-10 ${cardSurfaceClasses} inline-flex items-center gap-6`}>
        <div className="text-left">
          <span className={cardLabelClasses}>{copy.readingLabel}</span>
          <p className="font-display text-xl italic text-j-text-heading mt-1">{reading.name}</p>
        </div>
        {showsDiscountedPrice ? (
          <span className="font-display text-2xl italic flex items-baseline gap-2">
            <span className="line-through text-j-text-muted text-lg">{reading.price}</span>
            <span className="text-j-text-gold-lg">{paidAmount.display}</span>
          </span>
        ) : (
          <span className="font-display text-2xl italic text-j-text-gold-lg">
            {paidAmount.display ?? reading.price}
          </span>
        )}
      </div>

      <GoldDivider className="max-w-xs mx-auto my-12" />

      <div className="text-left max-w-prose mx-auto flex flex-col gap-5 font-body text-base text-j-text leading-relaxed">
        <p className="whitespace-pre-line">{copy.confirmationBody}</p>
        <p className="whitespace-pre-line">
          {renderWithSlots(copy.timelineBody, {
            deliveryDays: (
              <span className="font-display italic text-j-text-gold">{copy.deliveryDaysPhrase}</span>
            ),
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
    </ThankYouShell>
  );
}
