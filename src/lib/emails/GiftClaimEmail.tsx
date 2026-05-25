import { Button, Container, Section } from "@react-email/components";

import type { EmailGiftClaimContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { hasBodyContent, PortableTextBody, PortableTextInline } from "./PortableTextBody";

export type GiftClaimEmailVars = {
  recipientName: string;
  purchaserFirstName: string;
  readingName: string;
  readingPriceDisplay: string;
  giftMessage: string | null;
  claimUrl: string;
};

export type GiftClaimEmailProps = {
  vars: GiftClaimEmailVars;
  copy: EmailGiftClaimContent;
  shell?: EmailSharedShellContent;
};

export function GiftClaimEmail({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: GiftClaimEmailProps) {
  const copy = applyTokens(rawCopy, vars);
  const useFoldedBody = hasBodyContent(copy.body);

  return (
    <EmailShell preview={copy.previewFirstSend} bareContainer>
      <Container
        className="bg-cream border border-divider rounded"
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
            <BrandHeader shell={shell} />

            <GoldHero text={copy.heroLineFirstSend} />

            <Section
              className="font-sans text-body"
              style={{ padding: "32px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
            >
              {useFoldedBody ? (
                <PortableTextBody value={copy.body} />
              ) : (
                <>
                  <p style={{ margin: "0 0 18px 0" }}>{copy.greeting}</p>
                  <p style={{ margin: "0 0 18px 0" }}>
                    <PortableTextInline value={copy.bodyFirstSend} />
                  </p>
                </>
              )}
            </Section>

            {vars.giftMessage ? (
              <div style={{ padding: "0 48px 16px 48px" }}>
                <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
                  <p
                    className="font-sans text-muted uppercase"
                    style={{ margin: "0 0 6px 0", fontSize: 11, letterSpacing: "0.18em" }}
                  >
                    {copy.giftMessageLabel}
                  </p>
                  <p
                    className="font-serif italic text-ink"
                    style={{ margin: 0, fontSize: 18, lineHeight: 1.5 }}
                  >
                    {vars.giftMessage}
                  </p>
                </Section>
              </div>
            ) : null}

            <div style={{ padding: "8px 48px 8px 48px", textAlign: "center" }}>
              <Button
                href={vars.claimUrl}
                className="bg-ink text-cream font-sans no-underline rounded"
                style={{
                  padding: "14px 28px",
                  fontSize: 15,
                  letterSpacing: "0.08em",
                }}
              >
                {copy.claimButtonLabel}
              </Button>
              <p
                className="font-sans text-muted"
                style={{ margin: "16px 0 0 0", fontSize: 13, lineHeight: 1.6 }}
              >
                <PortableTextInline value={copy.claimUrlHelper} />
              </p>
            </div>

            <div style={{ padding: "20px 48px 0 48px" }}>
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
                <p className="font-sans text-muted" style={{ margin: 0, fontSize: 14 }}>
                  {copy.cardDeliveryLine}
                </p>
              </Section>
            </div>

            <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
