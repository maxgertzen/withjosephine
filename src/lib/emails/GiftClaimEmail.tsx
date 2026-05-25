import { Button, Container, Hr, Link, Section } from "@react-email/components";

import type { EmailGiftClaimContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { EmailShell } from "./EmailShell";
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
            <Section className="text-center" style={{ padding: "44px 48px 8px 48px" }}>
              <p
                className="font-serif text-ink"
                style={{
                  margin: 0,
                  fontWeight: 500,
                  fontSize: 38,
                  lineHeight: 1,
                  letterSpacing: "0.005em",
                }}
              >
                {shell.brandName}
              </p>
              <p
                className="font-sans text-muted uppercase"
                style={{ margin: "10px 0 0 0", fontSize: 11, letterSpacing: "0.32em" }}
              >
                {shell.brandSubtitle}
              </p>
            </Section>

            <Section className="text-center" style={{ padding: "32px 48px 8px 48px" }}>
              <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
                <tbody>
                  <tr>
                    <td width="18%">
                      <div className="border-t border-gold" />
                    </td>
                    <td
                      align="center"
                      className="font-serif text-ink"
                      style={{
                        padding: "0 16px",
                        fontWeight: 500,
                        fontSize: 28,
                        lineHeight: 1.2,
                      }}
                    >
                      {copy.heroLineFirstSend}
                    </td>
                    <td width="18%">
                      <div className="border-t border-gold" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

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

            <Section
              className="font-serif italic text-ink"
              style={{ padding: "36px 48px 16px 48px", fontSize: 22, lineHeight: 1.4 }}
            >
              <p style={{ margin: "0 0 4px 0" }}>{shell.signOffLine1}</p>
              <p style={{ margin: 0 }}>{shell.signOffLine2}</p>
            </Section>

            <Hr className="border-divider" style={{ margin: 0 }} />
            <Section
              className="font-sans text-muted"
              style={{ padding: "24px 48px 36px 48px", fontSize: 12, lineHeight: 1.7 }}
            >
              <p style={{ margin: 0 }}>
                <Link href="mailto:hello@withjosephine.com" className="text-ink no-underline">
                  hello@withjosephine.com
                </Link>
                &nbsp;&middot;&nbsp;
                <Link href="https://withjosephine.com" className="text-ink no-underline">
                  withjosephine.com
                </Link>
              </p>
              <p style={{ margin: "8px 0 0 0" }}>{shell.footerDisclaimer}</p>
            </Section>
      </Container>
    </EmailShell>
  );
}
