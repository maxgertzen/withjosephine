/**
 * Verbatim consent label text the user sees + acknowledges at intake. Locked
 * 2026-05-09 by Privacy Counsel for the uniform variant; per-reading Art. 9
 * variants locked 2026-05-18 following the evidence-cited Council recorded in
 * www/MEMORY/WORK/20260518-112650_v1.1.1-implementation/PRD.md `## Decisions`
 * — both Privacy Counsel and Adversarial-Litigator personas converged on
 * per-reading specificity (GDPR Art. 9(2)(a) "specified purposes" +
 * WP259 §3.2 + EDPB 05/2020 §3.2 granularity).
 *
 * Same string is rendered on the form AND written to Sanity's
 * `consentSnapshot.art6Consent.labelText` / `art9Consent.labelText` so the
 * audit trail records the exact wording the user accepted. Change here only
 * after a legal review and document the rationale in the PR.
 */

export type ReadingSlug = "soul-blueprint" | "birth-chart" | "akashic-record";

export const ART6_CONSENT_LABEL =
  "I agree to Josephine processing my booking details (name, email, birth data, photo, intake answers) to prepare my reading, under the Privacy Policy and Terms.";

export const ART9_CONSENT_LABEL_BY_READING: Record<ReadingSlug, string> = {
  "soul-blueprint":
    "I explicitly consent to Josephine using my birth chart, three questions and intake answers — which may reveal my spiritual or philosophical beliefs — to create a personal astrology and Akashic Record reading. I understand I can withdraw this consent at any time by emailing hello@withjosephine.com.",
  "birth-chart":
    "I explicitly consent to Josephine using my birth chart and intake answers — which may reveal my spiritual or philosophical beliefs — to create a personal astrology reading. I understand I can withdraw this consent at any time by emailing hello@withjosephine.com.",
  "akashic-record":
    "I explicitly consent to Josephine using my three questions and intake answers — which may reveal my spiritual or philosophical beliefs — to create a personal Akashic Record reading. I understand I can withdraw this consent at any time by emailing hello@withjosephine.com.",
};

function isReadingSlug(value: string): value is ReadingSlug {
  return value in ART9_CONSENT_LABEL_BY_READING;
}

export function art9ConsentLabel(slug: string): string {
  return isReadingSlug(slug)
    ? ART9_CONSENT_LABEL_BY_READING[slug]
    : ART9_CONSENT_LABEL_BY_READING["soul-blueprint"];
}

export const ART9_CONSENT_LABEL = ART9_CONSENT_LABEL_BY_READING["soul-blueprint"];

export const COOLING_OFF_CONSENT_LABEL =
  "I understand readings are non-refundable and waive my 14-day cooling-off right under EU Consumer Rights Directive 2011/83 Art. 16(m).";

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

export type ConsentRequirements = {
  requireArt9: boolean;
  requireCoolingOff?: boolean;
};

export function isFullyConsented(
  snapshot: LegalConsentSnapshot,
  requirements: ConsentRequirements,
): boolean {
  const requireCoolingOff = requirements.requireCoolingOff ?? true;
  if (!snapshot.art6.acknowledged) return false;
  if (requirements.requireArt9 && !snapshot.art9.acknowledged) return false;
  if (requireCoolingOff && !snapshot.coolingOff.acknowledged) return false;
  return true;
}

export const CONSENT_ACK_MESSAGE = "Please acknowledge to continue.";

export function collectConsentErrors(
  snapshot: LegalConsentSnapshot,
  options: ConsentRequirements,
): { art6?: string; art9?: string; coolingOff?: string } {
  const requireCoolingOff = options.requireCoolingOff ?? true;
  const errors: { art6?: string; art9?: string; coolingOff?: string } = {};
  if (!snapshot.art6.acknowledged) errors.art6 = CONSENT_ACK_MESSAGE;
  if (options.requireArt9 && !snapshot.art9.acknowledged)
    errors.art9 = CONSENT_ACK_MESSAGE;
  if (requireCoolingOff && !snapshot.coolingOff.acknowledged)
    errors.coolingOff = CONSENT_ACK_MESSAGE;
  return errors;
}

export type ConsentLabelOverrides = {
  art6Label?: string;
  readingSlug?: string;
};

export function emptyConsentSnapshot(
  overrides: ConsentLabelOverrides = {},
): LegalConsentSnapshot {
  return {
    art6: { acknowledged: false, labelText: overrides.art6Label ?? ART6_CONSENT_LABEL },
    art9: { acknowledged: false, labelText: art9ConsentLabel(overrides.readingSlug ?? "soul-blueprint") },
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
      labelText: art9ConsentLabel(overrides.readingSlug ?? "soul-blueprint"),
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
