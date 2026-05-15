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

// PRIVACY-COUNSEL-PENDING — Max pinged Counsel 2026-05-15; verbatim text lands in a follow-up commit.
export const COOLING_OFF_CONSENT_LABEL =
  "I understand readings are non-refundable and waive my 14-day cooling-off right under EU Consumer Rights Directive 2011/83 Art. 16(m).";

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

export function emptyConsentSnapshot(): LegalConsentSnapshot {
  return {
    art6: { acknowledged: false, labelText: ART6_CONSENT_LABEL },
    art9: { acknowledged: false, labelText: ART9_CONSENT_LABEL },
    coolingOff: { acknowledged: false, labelText: COOLING_OFF_CONSENT_LABEL },
  };
}
