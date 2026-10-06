import { Container, Section } from "@react-email/components";

import type { EmailGiftOpenedContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type GiftOpenedVars = {
  firstName: string;
  recipientName: string;
  readingName: string;
};

export type GiftOpenedProps = {
  vars: GiftOpenedVars;
  copy: EmailGiftOpenedContent;
  shell?: EmailSharedShellContent;
};

export function GiftOpened({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: GiftOpenedProps) {
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

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
