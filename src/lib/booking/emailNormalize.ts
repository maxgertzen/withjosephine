/**
 * Compare-safe email key used for own-email equality checks across gift
 * surfaces. NFKC-normalises to flatten ZWSP / homoglyphs and drops the
 * gmail-style `+suffix` from the local-part.
 *
 * The stored email is always the original trimmed-lowercase form — this
 * key is ONLY for comparing one email against another (e.g., recipient
 * vs purchaser). Plus-aliases route legitimately at the SMTP level so we
 * must not strip them from persisted values.
 */
export function ownEmailKey(email: string): string {
  const normalized = email.normalize("NFKC").trim().toLowerCase();
  const atIdx = normalized.lastIndexOf("@");
  if (atIdx < 1) return normalized;
  const local = normalized.slice(0, atIdx);
  const domain = normalized.slice(atIdx);
  const plusIdx = local.indexOf("+");
  const stripped = plusIdx === -1 ? local : local.slice(0, plusIdx);
  return `${stripped}${domain}`;
}
