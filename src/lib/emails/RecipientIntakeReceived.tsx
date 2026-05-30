import { Container, Section } from "@react-email/components";

import type { EmailRecipientIntakeReceivedContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type RecipientIntakeReceivedVars = {
  recipientName: string;
  purchaserFirstName: string;
  readingName: string;
};

export type RecipientIntakeReceivedProps = {
  vars: RecipientIntakeReceivedVars;
  copy: EmailRecipientIntakeReceivedContent;
  shell?: EmailSharedShellContent;
};

export function RecipientIntakeReceived({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: RecipientIntakeReceivedProps) {
  const copy = applyTokens(rawCopy, vars);
  return (
    <EmailShell preview={copy.preview} bareContainer>
      <Container
        className="bg-cream border border-divider rounded"
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <BrandHeader shell={shell} />

        <GoldHero text={copy.heroLine} nowrap />

        <Section
          className="font-sans text-body"
          style={{ padding: "32px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          <PortableTextBody value={copy.body} />
        </Section>

        <div style={{ padding: "0 48px" }}>
          <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
            <p
              className="font-sans text-muted uppercase"
              style={{ margin: "0 0 4px 0", fontSize: 11, letterSpacing: "0.18em" }}
            >
              {copy.cardLabel}
            </p>
            <p
              className="font-serif text-ink"
              style={{ margin: "0 0 12px 0", fontSize: 22 }}
            >
              {vars.readingName}
            </p>
            <p className="font-sans text-body" style={{ margin: 0, fontSize: 14 }}>
              <span className="text-muted">{copy.cardDeliveryLine}</span>
            </p>
          </Section>
        </div>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
