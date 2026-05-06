import { Text } from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

import { EmailShell } from "./EmailShell";
import { LabelValueRow } from "./LabelValueRow";
import { SerifHeading } from "./SerifHeading";

export type Day7OverdueAlertProps = {
  email: string;
  readingName: string;
  submissionId: string;
  createdAt: string;
};

export function Day7OverdueAlert({
  email,
  readingName,
  submissionId,
  createdAt,
}: Day7OverdueAlertProps) {
  return (
    <EmailShell maxWidth={640} preview={`Reading overdue — ${readingName} for ${email}`}>
      <SerifHeading>Reading overdue — past 7 days</SerifHeading>
      <Text>
        The following submission is past the 7-day delivery window and has no <code>deliveredAt</code> set:
      </Text>
      <LabelValueRow label="Client">{email}</LabelValueRow>
      <LabelValueRow label="Reading">{readingName}</LabelValueRow>
      <LabelValueRow label="Submission ID">{submissionId}</LabelValueRow>
      <LabelValueRow label="Created">{createdAt}</LabelValueRow>
      <Text style={{ color: t.muted, fontSize: 14, marginTop: 24 }}>
        Mark <code>deliveredAt</code> in Studio after uploading the voice note + PDF to fire the client delivery email.
      </Text>
    </EmailShell>
  );
}
