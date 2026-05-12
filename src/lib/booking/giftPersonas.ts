import type { SubmissionRecord } from "./submissions";

export function purchaserFirstNameFor(submission: SubmissionRecord): string {
  const fromResponses = submission.responses
    .find((r) => r.fieldKey === "purchaser_first_name")
    ?.value?.trim();
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
