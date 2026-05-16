import type { SubmissionRecord } from "./submissions";

/**
 * Phase 5 Session 4b — B7.26. Strip `{tag}` patterns from purchaser-
 * controlled inputs at the API boundary. Defends against a hostile
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

export function purchaserFirstNameOrNull(submission: SubmissionRecord): string | null {
  return (
    submission.responses
      .find((r) => r.fieldKey === "purchaser_first_name")
      ?.value?.trim() || null
  );
}

export function purchaserFirstNameFor(submission: SubmissionRecord): string {
  const fromResponses = purchaserFirstNameOrNull(submission);
  if (fromResponses) return fromResponses;
  const local = submission.email.split("@")[0] ?? submission.email;
  const lead = local.split(/[._+-]/)[0] ?? local;
  return lead ? lead.charAt(0).toUpperCase() + lead.slice(1) : "Someone";
}

export function recipientNameFor(submission: SubmissionRecord): string {
  return (
    submission.responses.find((r) => r.fieldKey === "recipient_name")?.value?.trim() || "there"
  );
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
