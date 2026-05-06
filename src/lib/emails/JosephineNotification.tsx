import { Link, Text } from "@react-email/components";

import type { SubmissionResponse } from "@/lib/resend";

import { EmailShell } from "./EmailShell";
import { LabelValueRow } from "./LabelValueRow";
import { SerifHeading } from "./SerifHeading";

// File uploads surface as a dedicated "Photo:" link block; consent toggles
// (e.g. "I don't know my birth time") are answered structurally elsewhere
// in the response set, so listing them as Yes/No rows is noise.
const NOISE_FIELD_TYPES = new Set(["fileUpload", "consent"]);

export type JosephineNotificationProps = {
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  email: string;
  createdAt: string;
  submissionId: string;
  photoUrl: string | null;
  responses: SubmissionResponse[];
};

export function JosephineNotification({
  readingName,
  readingPriceDisplay,
  amountPaidDisplay,
  email,
  createdAt,
  submissionId,
  photoUrl,
  responses,
}: JosephineNotificationProps) {
  const visible = responses.filter((r) => !NOISE_FIELD_TYPES.has(r.fieldType));
  return (
    <EmailShell maxWidth={640} preview={`New ${readingName} booking — ${email}`}>
      <SerifHeading>New {readingName} booking</SerifHeading>
      <LabelValueRow label="Status">Paid</LabelValueRow>
      <LabelValueRow label="Price">{readingPriceDisplay}</LabelValueRow>
      {amountPaidDisplay ? (
        <LabelValueRow label="Amount paid">{amountPaidDisplay}</LabelValueRow>
      ) : null}
      <LabelValueRow label="Client email">{email}</LabelValueRow>
      <LabelValueRow label="Submitted">{createdAt}</LabelValueRow>
      <LabelValueRow label="Submission ID">{submissionId}</LabelValueRow>
      {photoUrl ? (
        <LabelValueRow label="Photo">
          <Link href={photoUrl}>{photoUrl}</Link>
        </LabelValueRow>
      ) : null}
      <SerifHeading as="h2" className="mt-6">
        Responses
      </SerifHeading>
      {visible.length === 0 ? (
        <Text>
          <em>No responses recorded.</em>
        </Text>
      ) : (
        <table className="font-sans w-full" style={{ borderCollapse: "collapse" }}>
          <tbody>
            {visible.map((r) => (
              <tr key={r.fieldKey}>
                <td className="text-body align-top font-semibold" style={{ padding: "8px 12px" }}>
                  {r.fieldLabelSnapshot}
                </td>
                <td className="text-body align-top" style={{ padding: "8px 12px" }}>
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </EmailShell>
  );
}
