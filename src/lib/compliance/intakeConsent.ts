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
