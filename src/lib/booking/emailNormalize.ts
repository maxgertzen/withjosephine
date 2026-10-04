/**
 * Compare-safe email key used for own-email equality checks across gift
 * surfaces. NFKC-normalises to flatten ZWSP / homoglyphs and drops the
 * gmail-style `+suffix` from the local-part.
 *
 * The stored email is always the original trimmed-lowercase form — this
 * key is ONLY for comparing one email against another (e.g., recipient
 * vs purchaser). Plus-aliases route legitimately at the SMTP level so we
 * must not strip them from persisted values.
 *
 * **ZWSP accept-as-different decision.** NFKC
 * normalises invisible code points (U+200B zero-width space, U+200C/D
 * zero-width joiners, U+FEFF BOM) into separate-character sequences
 * rather than removing them. Two emails that differ ONLY by an embedded
 * ZWSP will therefore produce DIFFERENT keys here, and `ownEmailKey(a)
 * === ownEmailKey(b)` will return false. This is intentional: an attacker
 * who registers `alice@example.com` and `alice@​example.com` as
 * "matching" would let them bypass own-email checks, and we treat the
 * second as a distinct address. Trigger to revisit: if an abuse report
 * cites ZWSP-variant spam, add an explicit invisible-codepoint strip
 * before the trim+lowercase pipeline.
 */
/**
 * Strict normal form for an email address, preserving the address verbatim
 * (no `+suffix` stripping). Used wherever we need to compare a freshly-typed
 * email against a persisted value as literally the same address — e.g. the
 * gift-redeem recipient-email match, or seeding the pre-filled intake field
 * with the canonical form so draft-restore stays in sync.
 *
 * Differs from {@link ownEmailKey} which collapses gmail-style aliases for
 * own-email equality; use that when "alice+foo@" should equal "alice@".
 */
export function normalizeEmailForm(email: string): string {
  return email.normalize("NFKC").trim().toLowerCase();
}

export function ownEmailKey(email: string): string {
  const normalized = normalizeEmailForm(email);
  const atIdx = normalized.lastIndexOf("@");
  if (atIdx < 1) return normalized;
  const local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx);
  const plusIdx = local.indexOf("+");
  const stripped = plusIdx === -1 ? local : local.slice(0, plusIdx);
  return `${stripped}${domain}`;
}
