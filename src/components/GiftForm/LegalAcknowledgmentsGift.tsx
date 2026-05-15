import { Checkbox } from "@/components/Form/Checkbox/Checkbox";
import type { LegalConsentSnapshot } from "@/lib/compliance/intakeConsent";

export type LegalAcknowledgmentsGiftErrors = {
  art6?: string;
  coolingOff?: string;
};

type LegalAcknowledgmentsGiftProps = {
  snapshot: LegalConsentSnapshot;
  setSnapshot: (next: LegalConsentSnapshot) => void;
  errors: LegalAcknowledgmentsGiftErrors;
  clearError: (key: keyof LegalAcknowledgmentsGiftErrors) => void;
  consentIntro?: string;
  nonRefundableNotice: string;
  isSubmitting: boolean;
};

export function LegalAcknowledgmentsGift({
  snapshot,
  setSnapshot,
  errors,
  clearError,
  consentIntro,
  nonRefundableNotice,
  isSubmitting,
}: LegalAcknowledgmentsGiftProps) {
  return (
    <section className="flex flex-col gap-4 bg-j-warm/40 border border-j-border-subtle rounded-2xl p-6">
      {consentIntro ? (
        <p className="font-display italic text-base text-j-text-muted">{consentIntro}</p>
      ) : null}
      <p className="font-body text-sm text-j-text-muted leading-relaxed whitespace-pre-line">
        {nonRefundableNotice}
      </p>
      <Checkbox
        id="gift-art6-consent"
        name="art6Consent"
        checked={snapshot.art6.acknowledged}
        onChange={(checked) => {
          setSnapshot({
            ...snapshot,
            art6: { ...snapshot.art6, acknowledged: checked },
          });
          if (checked) clearError("art6");
        }}
        error={errors.art6}
        disabled={isSubmitting}
        required
      >
        {snapshot.art6.labelText}
      </Checkbox>
      <Checkbox
        id="gift-cooling-off-consent"
        name="coolingOffConsent"
        checked={snapshot.coolingOff.acknowledged}
        onChange={(checked) => {
          setSnapshot({
            ...snapshot,
            coolingOff: { ...snapshot.coolingOff, acknowledged: checked },
          });
          if (checked) clearError("coolingOff");
        }}
        error={errors.coolingOff}
        disabled={isSubmitting}
        required
      >
        {snapshot.coolingOff.labelText}
      </Checkbox>
    </section>
  );
}
