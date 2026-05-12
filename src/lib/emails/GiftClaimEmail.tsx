import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";

import type { EmailGiftClaimContent } from "@/data/defaults";

import { emailTailwindConfig } from "./theme.config";

type GiftClaimSharedVars = {
  recipientName: string;
  purchaserFirstName: string;
  readingName: string;
  giftMessage: string | null;
};

export type GiftClaimEmailVars = GiftClaimSharedVars &
  (
    | { variant: "first_send"; claimUrl: string }
    | { variant: "reminder"; claimUrl?: never }
  );

export type GiftClaimEmailProps = {
  vars: GiftClaimEmailVars;
  copy: EmailGiftClaimContent;
};

function template(text: string, vars: GiftClaimEmailVars): string {
  return text
    .replaceAll("{recipientName}", vars.recipientName)
    .replaceAll("{purchaserFirstName}", vars.purchaserFirstName)
    .replaceAll("{readingName}", vars.readingName);
}

export function GiftClaimEmail({ vars, copy }: GiftClaimEmailProps) {
  const heroLine = vars.variant === "first_send" ? copy.heroLineFirstSend : copy.heroLineReminder;
  const body = vars.variant === "first_send" ? copy.bodyFirstSend : copy.bodyReminder;
  const preview = vars.variant === "first_send" ? copy.previewFirstSend : copy.previewReminder;

  return (
    <Html lang="en">
      <Head />
      <Preview>{template(preview, vars)}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-warm m-0 p-0">
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
                {copy.brandName}
              </p>
              <p
                className="font-sans text-muted uppercase"
                style={{ margin: "10px 0 0 0", fontSize: 11, letterSpacing: "0.32em" }}
              >
                {copy.brandSubtitle}
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
                      {heroLine}
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
              <p style={{ margin: "0 0 18px 0" }}>{template(copy.greeting, vars)}</p>
              <p style={{ margin: "0 0 18px 0" }}>{template(body, vars)}</p>
            </Section>

            {vars.giftMessage ? (
              <div style={{ padding: "0 48px 16px 48px" }}>
                <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
                  <p
                    className="font-sans text-muted uppercase"
                    style={{ margin: "0 0 6px 0", fontSize: 11, letterSpacing: "0.18em" }}
                  >
                    {template(copy.giftMessageLabel, vars)}
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

            {vars.variant === "first_send" ? (
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
                  {copy.claimUrlHelper}
                </p>
              </div>
            ) : (
              <Section
                className="font-sans text-body"
                style={{ padding: "0 48px 8px 48px", lineHeight: 1.7, fontSize: 14 }}
              >
                <p style={{ margin: 0 }}>{copy.reminderContactLine}</p>
              </Section>
            )}

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
              <p style={{ margin: "0 0 4px 0" }}>{copy.signOffLine1}</p>
              <p style={{ margin: 0 }}>{copy.signOffLine2}</p>
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
              <p style={{ margin: "8px 0 0 0" }}>{copy.footerDisclaimer}</p>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
