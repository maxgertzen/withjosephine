import { Button, Container, Section } from "@react-email/components";

import type { EmailNewDeviceNoticeContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type NewDeviceNoticeVars = {
  firstName: string;
  revokeUrl: string;
};

export type NewDeviceNoticeProps = {
  vars: NewDeviceNoticeVars;
  copy: EmailNewDeviceNoticeContent;
  shell?: EmailSharedShellContent;
};

export function NewDeviceNotice({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: NewDeviceNoticeProps) {
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
          <PortableTextBody value={copy.bodyIntro} />
        </Section>

        <div style={{ padding: "8px 48px 8px 48px", textAlign: "center" }}>
          <Button
            href={vars.revokeUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 50,
              letterSpacing: "0.02em",
            }}
          >
            {copy.wasItYouButtonLabel}
          </Button>
        </div>

        <Section
          className="font-sans text-body"
          style={{ padding: "24px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          <PortableTextBody value={copy.bodyPostButton} />
        </Section>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
