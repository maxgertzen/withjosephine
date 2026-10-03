import { Button, Container, Section } from "@react-email/components";

import type { EmailReadingDeliveryContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type ReadingDeliveryVars = {
  firstName: string;
  readingName: string;
  listenUrl: string;
};

export type ReadingDeliveryProps = {
  vars: ReadingDeliveryVars;
  copy: EmailReadingDeliveryContent;
  shell?: EmailSharedShellContent;
};

export function ReadingDelivery({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: ReadingDeliveryProps) {
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
            href={vars.listenUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 50,
              letterSpacing: "0.02em",
            }}
          >
            {copy.openButtonLabel}
          </Button>
        </div>

        <Section
          className="font-sans text-body"
          style={{ padding: "24px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          <PortableTextBody value={copy.bodyPostButton} />
        </Section>

        <div style={{ padding: "0 48px" }}>
          <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
            <p
              className="font-sans text-muted-warm uppercase"
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
            <p
              className="font-sans text-muted-warm"
              style={{ margin: 0, fontSize: 14 }}
            >
              {copy.cardDeliveryLine}
            </p>
          </Section>
        </div>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
