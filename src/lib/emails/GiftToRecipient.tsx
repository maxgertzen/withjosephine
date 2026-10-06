import { Button, Container, Section } from "@react-email/components";

import type { EmailGiftToRecipientContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PILL_BUTTON_STYLE } from "./pillButtonStyle";
import { PortableTextBody } from "./PortableTextBody";
import { ReadingCard } from "./ReadingCard";

export type GiftToRecipientVars = {
  firstName: string;
  buyerName: string;
  readingName: string;
  displayCode: string;
  giftUrl: string;
  note: string | null;
};

export type GiftToRecipientProps = {
  vars: GiftToRecipientVars;
  copy: EmailGiftToRecipientContent;
  shell?: EmailSharedShellContent;
};

export function giftToRecipientTokens(vars: GiftToRecipientVars) {
  return {
    firstName: vars.firstName,
    buyerName: vars.buyerName,
    readingName: vars.readingName,
    code: vars.displayCode,
  };
}

export function GiftToRecipient({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: GiftToRecipientProps) {
  const copy = applyTokens(rawCopy, giftToRecipientTokens(vars));

  return (
    <EmailShell preview={copy.previewTemplate} bareContainer>
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

        {vars.note ? (
          <div style={{ padding: "0 48px 16px 48px" }}>
            <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
              <p
                className="font-sans text-muted-warm uppercase"
                style={{ margin: "0 0 8px 0", fontSize: 11, letterSpacing: "0.18em" }}
              >
                {copy.noteLabelTemplate}
              </p>
              <p
                className="font-serif italic text-ink"
                style={{ margin: 0, fontSize: 18, lineHeight: 1.5, whiteSpace: "pre-line" }}
              >
                {vars.note}
              </p>
            </Section>
          </div>
        ) : null}

        <div style={{ padding: "8px 48px 24px 48px", textAlign: "center" }}>
          <Button
            href={vars.giftUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={PILL_BUTTON_STYLE}
          >
            {copy.openButtonLabel}
          </Button>
          <p
            className="font-sans text-muted-warm"
            style={{ margin: "12px 0 0 0", fontSize: 13, lineHeight: 1.6 }}
          >
            {copy.codeFallbackTemplate}
          </p>
        </div>

        <ReadingCard label={copy.cardLabel} readingName={vars.readingName}>
          <p className="font-sans text-muted-warm" style={{ margin: 0, fontSize: 14 }}>
            {copy.cardDeliveryLine}
          </p>
        </ReadingCard>

        <Section
          className="font-sans text-muted-warm"
          style={{ padding: "20px 48px 0 48px", fontSize: 13, lineHeight: 1.6 }}
        >
          <p style={{ margin: 0 }}>{copy.privacyLineTemplate}</p>
        </Section>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
