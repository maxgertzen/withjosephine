import { Heading, Text } from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

import { EmailShell } from "./shell";

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
      <Heading as="h1" style={{ fontFamily: t.serifFamily, color: t.ink }}>
        Reading overdue — past 7 days
      </Heading>
      <Text>
        The following submission is past the 7-day delivery window and has no <code>deliveredAt</code> set:
      </Text>
      <Text>
        <strong>Client:</strong> {email}
      </Text>
      <Text>
        <strong>Reading:</strong> {readingName}
      </Text>
      <Text>
        <strong>Submission ID:</strong> {submissionId}
      </Text>
      <Text>
        <strong>Created:</strong> {createdAt}
      </Text>
      <Text style={{ color: t.muted, fontSize: 14, marginTop: 24 }}>
        Mark <code>deliveredAt</code> in Studio after uploading the voice note + PDF to fire the client delivery email.
      </Text>
    </EmailShell>
  );
}
