/**
 * Verbatim consent label text the user sees + acknowledges at intake. Locked
 * 2026-05-09 by Privacy Counsel; see
 * www/MEMORY/WORK/20260509-202915_phase4-compliance-hardening/PRD.md
 * `## Decisions`.
 *
 * Two consents are captured separately to satisfy GDPR's Art. 9 specificity
 * requirement — a bundled "I agree" cannot cover special-category processing.
 *
 * Same string is rendered on the form AND written to Sanity's
 * `consentSnapshot.art6Consent.labelText` / `art9Consent.labelText` so the
 * audit trail records the exact wording the user accepted. Change here only
 * after a legal review and document the rationale in the PR.
 */

export const ART6_CONSENT_LABEL =
  "I agree to Josephine processing my booking details (name, email, birth data, photo, intake answers) to prepare my reading, under the Privacy Policy and Terms.";

export const ART9_CONSENT_LABEL =
  "I explicitly consent to Josephine using my birth chart and intake answers — which may reveal my spiritual or philosophical beliefs — to create a personal astrology and Akashic Record reading. I understand I can withdraw this consent at any time by emailing hello@withjosephine.com.";

// PRIVACY-COUNSEL-PENDING — verbatim text pending counsel sign-off.
export const COOLING_OFF_CONSENT_LABEL =
  "I understand readings are non-refundable and waive my 14-day cooling-off right under EU Consumer Rights Directive 2011/83 Art. 16(m).";

// PRIVACY-COUNSEL-PENDING — purchaser-scoped Art. 6 for gift purchase flow.
// Distinct from ART6_CONSENT_LABEL because the purchaser is not providing their
// own birth/intake data — the recipient does that at redeem time.
export const GIFT_ART6_CONSENT_LABEL =
  "I agree to Josephine processing my contact details and the recipient's contact details to fulfill this gift purchase, under the Privacy Policy and Terms.";

export interface LegalConsentAck {
  acknowledged: boolean;
  labelText: string;
}

export interface LegalConsentSnapshot {
  art6: LegalConsentAck;
  art9: LegalConsentAck;
  coolingOff: LegalConsentAck;
}

export function isFullyConsented(
  snapshot: LegalConsentSnapshot,
  requireArt9: boolean,
): boolean {
  if (!snapshot.art6.acknowledged) return false;
  if (requireArt9 && !snapshot.art9.acknowledged) return false;
  if (!snapshot.coolingOff.acknowledged) return false;
  return true;
}

export const CONSENT_ACK_MESSAGE = "Please acknowledge to continue.";

export function collectConsentErrors(
  snapshot: LegalConsentSnapshot,
  options: { requireArt9: boolean },
): { art6?: string; art9?: string; coolingOff?: string } {
  const errors: { art6?: string; art9?: string; coolingOff?: string } = {};
  if (!snapshot.art6.acknowledged) errors.art6 = CONSENT_ACK_MESSAGE;
  if (options.requireArt9 && !snapshot.art9.acknowledged)
    errors.art9 = CONSENT_ACK_MESSAGE;
  if (!snapshot.coolingOff.acknowledged)
    errors.coolingOff = CONSENT_ACK_MESSAGE;
  return errors;
}

export type ConsentLabelOverrides = {
  art6Label?: string;
};

export function emptyConsentSnapshot(
  overrides: ConsentLabelOverrides = {},
): LegalConsentSnapshot {
  return {
    art6: { acknowledged: false, labelText: overrides.art6Label ?? ART6_CONSENT_LABEL },
    art9: { acknowledged: false, labelText: ART9_CONSENT_LABEL },
    coolingOff: { acknowledged: false, labelText: COOLING_OFF_CONSENT_LABEL },
  };
}

export type ConsentBodyFlags = {
  art6Consent: boolean;
  art9Consent?: boolean;
  coolingOffConsent: boolean;
};

export function consentSnapshotFromBody(
  flags: ConsentBodyFlags,
  overrides: ConsentLabelOverrides = {},
): LegalConsentSnapshot {
  return {
    art6: {
      acknowledged: flags.art6Consent,
      labelText: overrides.art6Label ?? ART6_CONSENT_LABEL,
    },
    art9: {
      acknowledged: flags.art9Consent ?? false,
      labelText: ART9_CONSENT_LABEL,
    },
    coolingOff: {
      acknowledged: flags.coolingOffConsent,
      labelText: COOLING_OFF_CONSENT_LABEL,
    },
  };
}

export function serializeAcknowledgedLabels(snapshot: LegalConsentSnapshot): string {
  return [snapshot.art6, snapshot.art9, snapshot.coolingOff]
    .filter((ack) => ack.acknowledged)
    .map((ack) => ack.labelText)
    .join("\n---\n");
}

export type GiftPurchaserConsentFlags = {
  art6Consent: boolean;
  coolingOffConsent: boolean;
};

export function emptyGiftPurchaserConsentSnapshot(): LegalConsentSnapshot {
  return emptyConsentSnapshot({ art6Label: GIFT_ART6_CONSENT_LABEL });
}

export function giftPurchaserConsentSnapshot(
  flags: GiftPurchaserConsentFlags,
): LegalConsentSnapshot {
  return consentSnapshotFromBody(
    { ...flags, art9Consent: false },
    { art6Label: GIFT_ART6_CONSENT_LABEL },
  );
}
