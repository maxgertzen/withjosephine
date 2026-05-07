import { Hr } from "@react-email/components";
import { Fragment } from "react";

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
      <Hr className="border-divider my-6" />
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
