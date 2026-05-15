import { Checkbox } from "@/components/Form/Checkbox/Checkbox";
import type { LegalConsentSnapshot } from "@/lib/compliance/intakeConsent";

export type LegalAcknowledgmentsErrors = {
  art6?: string;
  art9?: string;
  coolingOff?: string;
};

type LegalAcknowledgmentsProps = {
  snapshot: LegalConsentSnapshot;
  setSnapshot: (next: LegalConsentSnapshot) => void;
  errors: LegalAcknowledgmentsErrors;
  clearError: (key: keyof LegalAcknowledgmentsErrors) => void;
  nonRefundableNotice: string;
  isSubmitting: boolean;
};

export function LegalAcknowledgments({
  snapshot,
  setSnapshot,
  errors,
  clearError,
  nonRefundableNotice,
  isSubmitting,
}: LegalAcknowledgmentsProps) {
  return (
    <section className="flex flex-col gap-4 bg-j-warm/40 border border-j-border-subtle rounded-2xl p-6">
      <p className="font-body text-sm text-j-text-muted leading-relaxed whitespace-pre-line">
        {nonRefundableNotice}
      </p>
      <Checkbox
        id="field-art6-consent"
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
        id="field-art9-consent"
        name="art9Consent"
        checked={snapshot.art9.acknowledged}
        onChange={(checked) => {
          setSnapshot({
            ...snapshot,
            art9: { ...snapshot.art9, acknowledged: checked },
          });
          if (checked) clearError("art9");
        }}
        error={errors.art9}
        disabled={isSubmitting}
        required
      >
        {snapshot.art9.labelText}
      </Checkbox>
      <Checkbox
        id="field-cooling-off-consent"
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
