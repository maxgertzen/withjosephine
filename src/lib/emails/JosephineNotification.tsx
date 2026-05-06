import { Heading, Link, Text } from "@react-email/components";

import type { SubmissionResponse } from "@/lib/resend";
import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

import { EmailShell } from "./shell";

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
      <Heading as="h1" style={{ fontFamily: t.serifFamily, color: t.ink }}>
        New {readingName} booking
      </Heading>
      <Text>
        <strong>Status:</strong> Paid
      </Text>
      <Text>
        <strong>Price:</strong> {readingPriceDisplay}
      </Text>
      {amountPaidDisplay ? (
        <Text>
          <strong>Amount paid:</strong> {amountPaidDisplay}
        </Text>
      ) : null}
      <Text>
        <strong>Client email:</strong> {email}
      </Text>
      <Text>
        <strong>Submitted:</strong> {createdAt}
      </Text>
      <Text>
        <strong>Submission ID:</strong> {submissionId}
      </Text>
      {photoUrl ? (
        <Text>
          <strong>Photo:</strong>{" "}
          <Link href={photoUrl}>{photoUrl}</Link>
        </Text>
      ) : null}
      <Heading
        as="h2"
        style={{ fontFamily: t.serifFamily, color: t.ink, marginTop: 24 }}
      >
        Responses
      </Heading>
      {visible.length === 0 ? (
        <Text>
          <em>No responses recorded.</em>
        </Text>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontFamily: t.sansFamily,
          }}
        >
          <tbody>
            {visible.map((r) => (
              <tr key={r.fieldKey}>
                <td
                  style={{
                    padding: "8px 12px",
                    verticalAlign: "top",
                    fontWeight: 600,
                    color: t.body,
                  }}
                >
                  {r.fieldLabelSnapshot}
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    verticalAlign: "top",
                    color: t.body,
                  }}
                >
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
