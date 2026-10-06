import { Button, Container, Link, Section, Text } from "@react-email/components";

import type { EmailGiftPurchaseContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PILL_BUTTON_STYLE } from "./pillButtonStyle";
import { PortableTextBody } from "./PortableTextBody";
import { ReadingCard } from "./ReadingCard";

export type GiftPurchaseVars = {
  firstName: string;
  readingName: string;
  hasNote: boolean;
  displayCode: string;
  giftUrl: string;
  whatsappUrl: string;
  sendUrl: string;
};

export type GiftPurchaseProps = {
  vars: GiftPurchaseVars;
  copy: EmailGiftPurchaseContent;
  shell?: EmailSharedShellContent;
};

export function GiftPurchase({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: GiftPurchaseProps) {
  const copy = applyTokens(rawCopy, { firstName: vars.firstName, readingName: vars.readingName });

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
          {vars.hasNote ? <Text className="text-base leading-[1.75]">{copy.noteLine}</Text> : null}
        </Section>

        <ReadingCard label={copy.cardLabel} readingName={vars.readingName} centered>
          <p
            className="font-sans text-ink"
            style={{ margin: "0 0 12px 0", fontSize: 24, letterSpacing: "0.12em" }}
          >
            {vars.displayCode}
          </p>
          <p className="font-sans text-muted-warm" style={{ margin: 0, fontSize: 14 }}>
            {copy.cardLineTemplate}
          </p>
        </ReadingCard>

        <Section
          className="font-sans text-center"
          style={{ padding: "24px 48px 8px 48px", fontSize: 14, lineHeight: 1.6 }}
        >
          <p style={{ margin: "0 0 20px 0" }}>
            <Link href={vars.giftUrl} className="text-ink">
              {vars.giftUrl}
            </Link>
          </p>
          <Button
            href={vars.whatsappUrl}
            className="border border-solid border-gold text-ink font-sans no-underline"
            style={{ ...PILL_BUTTON_STYLE, marginBottom: 12 }}
          >
            {copy.shareButtonLabel}
          </Button>
          <br />
          <Button
            href={vars.sendUrl}
            className="border border-solid border-ink bg-ink text-cream font-sans no-underline"
            style={PILL_BUTTON_STYLE}
          >
            {copy.sendButtonLabel}
          </Button>
        </Section>

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
