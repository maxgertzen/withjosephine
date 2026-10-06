import { Text } from "@react-email/components";

import { EmailShell } from "./EmailShell";
import { LabelValueRow } from "./LabelValueRow";
import { SerifHeading } from "./SerifHeading";

export type ReadingOverdueAlertProps = {
  email: string;
  readingName: string;
  submissionId: string;
  createdAt: string;
};

export function ReadingOverdueAlert({
  email,
  readingName,
  submissionId,
  createdAt,
}: ReadingOverdueAlertProps) {
  return (
    <EmailShell maxWidth={640} preview={`Reading overdue — ${readingName} for ${email}`}>
      <SerifHeading>Reading overdue — past 7 days</SerifHeading>
      <Text>
        The following submission is past the 7-day delivery window and its reading has not been sent:
      </Text>
      <LabelValueRow label="Client">{email}</LabelValueRow>
      <LabelValueRow label="Reading">{readingName}</LabelValueRow>
      <LabelValueRow label="Submission ID">{submissionId}</LabelValueRow>
      <LabelValueRow label="Created">{createdAt}</LabelValueRow>
      <Text className="text-muted-warm text-sm mt-6">
        Upload and publish the voice note and the PDF in Studio, then press Send reading now.
      </Text>
    </EmailShell>
  );
}
