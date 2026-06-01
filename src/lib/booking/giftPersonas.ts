import type { SubmissionRecord } from "@/lib/page-previews/types";

/**
 * Strip `{tag}` patterns from purchaser-controlled inputs at the API
 * boundary. Defends against a hostile
 * purchaser sneaking `{recipientName}` (or other template variable names)
 * into a stored field that later feeds an email template — substitution
 * happens after storage, so an unstripped tag would silently hijack the
 * downstream interpolation. Stripping at submit-time keeps every consumer
 * of the field safe without per-template defensive logic.
 *
 * We strip the entire `{...}` span (including the braces). Non-greedy so
 * `prefix {foo} middle {bar} suffix` becomes `prefix  middle  suffix`.
 */
const TEMPLATE_TAG_RE = /\{[^}]*\}/g;

export function stripTemplateTags(input: string): string {
  return input.replace(TEMPLATE_TAG_RE, "").trim();
}

/**
 * Capitalise the lead token of an email's local-part as a soft fallback when
 * no explicit name is on record. Shared by purchaser + recipient personas so
 * the "Marco" derived from `maxgertzen+marco@gmail.com` reads the same way in
 * any persona-derivation site.
 */
export function firstNameFromEmailLocal(email: string, sentinel: string): string {
  if (!email) return sentinel;
  const local = email.split("@")[0] ?? email;
  const lead = local.split(/[._+-]/)[0] ?? local;
  return lead ? lead.charAt(0).toUpperCase() + lead.slice(1) : sentinel;
}

export function purchaserFirstNameOrNull(submission: SubmissionRecord): string | null {
  return (
    submission.responses
      .find((r) => r.fieldKey === "purchaser_first_name")
      ?.value?.trim() || null
  );
}

export function purchaserFirstNameFor(submission: SubmissionRecord): string {
  return purchaserFirstNameOrNull(submission) ?? firstNameFromEmailLocal(submission.email, "Someone");
}

/**
 * The literal value the purchaser typed into the recipient-name field, or
 * null if absent / empty after trim. Distinct from recipientNameFor which
 * falls back to the intake-side first-name chain after redeem wipes the
 * original response.
 */
export function purchaserSuppliedRecipientName(
  submission: { responses: { fieldKey: string; value: string }[] },
): string | null {
  return (
    submission.responses
      .find((r) => r.fieldKey === "recipient_name")
      ?.value?.trim() || null
  );
}

export function recipientNameFor(submission: SubmissionRecord): string {
  const fromPurchaser = purchaserSuppliedRecipientName(submission);
  if (fromPurchaser) return fromPurchaser;
  return recipientFirstNameFromIntakeResponses(submission.responses, submission.email ?? "");
}

/**
 * Recipient-side first name derivation used at gift-redeem time when the row
 * has just been overwritten with the recipient's own intake (first_name or
 * legal_full_name). Falls through to the email local-part so the
 * recipient-intake-received email always has something better than "there".
 */
export function recipientFirstNameFromIntakeResponses(
  responses: { fieldKey: string; value: string }[],
  email: string,
): string {
  const fromFirstName = responses.find((r) => r.fieldKey === "first_name")?.value?.trim();
  if (fromFirstName) return fromFirstName;
  const fromLegal = responses.find((r) => r.fieldKey === "legal_full_name")?.value?.trim();
  if (fromLegal) return fromLegal.split(/\s+/)[0] ?? fromLegal;
  return firstNameFromEmailLocal(email, "there");
}

/**
 * Surface label for the purchaser's `/my-gifts` listing: prefer the name
 * the purchaser typed, fall back to the recipient email so they can still
 * identify the gift, and finally to a soft sentinel when neither is present
 * (self-send mode where the purchaser chose to skip both).
 */
export function recipientLabelFor(submission: SubmissionRecord): string {
  const named = submission.responses
    .find((r) => r.fieldKey === "recipient_name")
    ?.value?.trim();
  if (named) return named;
  if (submission.recipientEmail) return submission.recipientEmail;
  return "your recipient";
}
