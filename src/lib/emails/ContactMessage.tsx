import { Hr } from "@react-email/components";
import { Fragment } from "react";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

import { EmailShell } from "./EmailShell";
import { LabelValueRow } from "./LabelValueRow";
import { SerifHeading } from "./SerifHeading";

export type ContactMessageProps = {
  name: string;
  email: string;
  message: string;
};

export function ContactMessage({ name, email, message }: ContactMessageProps) {
  const lines = message.split("\n");
  return (
    <EmailShell maxWidth={640} preview={`New message from ${name}`}>
      <SerifHeading>New message from {name}</SerifHeading>
      <LabelValueRow label="From">
        {name} &lt;{email}&gt;
      </LabelValueRow>
      <Hr style={{ borderTop: `1px solid ${t.divider}`, margin: "24px 0" }} />
      <div style={{ whiteSpace: "pre-wrap" }}>
        {lines.map((line, index) => (
          <Fragment key={index}>
            {index > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </div>
    </EmailShell>
  );
}
