import { Link, Text } from "@react-email/components";

import { isVisibleIntakeAnswer } from "@/lib/booking/intakeAnswers";
import type { SubmissionResponse } from "@/lib/resend";

import { EmailShell } from "./EmailShell";
import { LabelValueRow } from "./LabelValueRow";
import { SerifHeading } from "./SerifHeading";

export type JosephineNotificationProps = {
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  email: string;
  createdAt: string;
  submissionId: string;
  photoUrl: string | null;
  responses: SubmissionResponse[];
  giftBuyerFirstName?: string;
};

export function josephineNotificationTitle(readingName: string, giftBuyerFirstName?: string) {
  const booking = `New ${readingName} booking`;
  if (giftBuyerFirstName === undefined) return booking;
  return giftBuyerFirstName ? `${booking}, gift from ${giftBuyerFirstName}` : `${booking}, gift`;
}

export function JosephineNotification({
  readingName,
  readingPriceDisplay,
  amountPaidDisplay,
  email,
  createdAt,
  submissionId,
  photoUrl,
  responses,
  giftBuyerFirstName,
}: JosephineNotificationProps) {
  const visible = responses.filter(isVisibleIntakeAnswer);
  const title = josephineNotificationTitle(readingName, giftBuyerFirstName);
  return (
    <EmailShell maxWidth={640} preview={`${title} — ${email}`}>
      <SerifHeading>{title}</SerifHeading>
      <LabelValueRow label="Status">
        {giftBuyerFirstName === undefined ? "Paid" : "Paid by gift"}
      </LabelValueRow>
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
