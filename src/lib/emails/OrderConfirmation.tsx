import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

export type OrderConfirmationProps = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
};

/**
 * The thank-you page shows a strikethrough-on-discount visual using cents-
 * level comparison (Stripe `amount_total` vs Sanity `reading.price`). Email
 * only has formatted strings, where Intl emits `"$179.00"` while Sanity stores
 * `"$179"` — those never match by string. Surface what the customer paid.
 */
function priceCell(readingPriceDisplay: string, amountPaidDisplay: string | null): string {
  return amountPaidDisplay ?? readingPriceDisplay;
}

export function OrderConfirmation({
  firstName,
  readingName,
  readingPriceDisplay,
  amountPaidDisplay,
}: OrderConfirmationProps) {
  const price = priceCell(readingPriceDisplay, amountPaidDisplay);

  return (
    <Html lang="en">
      <Head />
      <Preview>Your reading is booked — here&apos;s what happens next</Preview>
      <Body style={{ backgroundColor: t.warm, margin: 0, padding: 0 }}>
        <Container
          style={{
            maxWidth: 600,
            margin: "0 auto",
            backgroundColor: t.cream,
            border: `1px solid ${t.divider}`,
            borderRadius: 4,
          }}
        >
          {/* Header */}
          <Section style={{ padding: "44px 48px 8px 48px", textAlign: "center" }}>
            <Text
              style={{
                margin: 0,
                fontFamily: t.serifFamily,
                fontWeight: 500,
                fontSize: 38,
                color: t.ink,
                lineHeight: 1,
                letterSpacing: "0.005em",
              }}
            >
              Josephine
            </Text>
            <Text
              style={{
                margin: "10px 0 0 0",
                fontFamily: t.sansFamily,
                fontSize: 11,
                color: t.muted,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
              }}
            >
              Soul Readings
            </Text>
          </Section>

          {/* Title with gold rule lines */}
          <Section style={{ padding: "32px 48px 8px 48px", textAlign: "center" }}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width="100%"
            >
              <tbody>
                <tr>
                  <td width="18%">
                    <div style={{ borderTop: `1px solid ${t.gold}` }} />
                  </td>
                  <td
                    align="center"
                    style={{
                      padding: "0 16px",
                      fontFamily: t.serifFamily,
                      fontWeight: 500,
                      fontSize: 28,
                      color: t.ink,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Your reading is booked
                  </td>
                  <td width="18%">
                    <div style={{ borderTop: `1px solid ${t.gold}` }} />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Body */}
          <Section
            style={{
              padding: "32px 48px 16px 48px",
              fontFamily: t.sansFamily,
              color: t.body,
              lineHeight: 1.75,
              fontSize: 16,
            }}
          >
            <Text style={{ margin: "0 0 18px 0" }}>Hi {firstName},</Text>
            <Text style={{ margin: "0 0 18px 0" }}>
              Thank you for booking a {readingName} with me. I have your intake and your payment, and you don&apos;t need to do anything else.
            </Text>
            <Text style={{ margin: "0 0 18px 0" }}>
              I&apos;ll begin your reading in the next day or two. You&apos;ll hear a short note from me when I do, just so you know it&apos;s underway. Your voice note and PDF will arrive within seven days, to this email address.
            </Text>
            <Text style={{ margin: "0 0 32px 0" }}>
              If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.
            </Text>
          </Section>

          {/* Inset price card */}
          <Section style={{ padding: "0 48px" }}>
            <Section style={{ backgroundColor: t.warm, borderRadius: 4, padding: "20px 24px" }}>
              <Text
                style={{
                  margin: "0 0 4px 0",
                  fontFamily: t.sansFamily,
                  fontSize: 11,
                  color: t.muted,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                Your reading
              </Text>
              <Text
                style={{
                  margin: "0 0 12px 0",
                  fontFamily: t.serifFamily,
                  fontSize: 22,
                  color: t.ink,
                }}
              >
                {readingName}
              </Text>
              <Text
                style={{
                  margin: 0,
                  fontFamily: t.sansFamily,
                  fontSize: 14,
                  color: t.body,
                }}
              >
                <span style={{ color: t.muted }}>Delivery within 7 days</span>
                &nbsp;&middot;&nbsp;
                <span>{price}</span>
              </Text>
            </Section>
          </Section>

          {/* Signature */}
          <Section
            style={{
              padding: "36px 48px 16px 48px",
              fontFamily: t.serifFamily,
              fontStyle: "italic",
              fontSize: 22,
              color: t.ink,
              lineHeight: 1.4,
            }}
          >
            <Text style={{ margin: "0 0 4px 0" }}>With love,</Text>
            <Text style={{ margin: 0 }}>
              Josephine <span style={{ color: t.gold }}>✦</span>
            </Text>
          </Section>

          {/* Footer */}
          <Hr style={{ borderTop: `1px solid ${t.divider}`, margin: 0 }} />
          <Section
            style={{
              padding: "24px 48px 36px 48px",
              fontFamily: t.sansFamily,
              fontSize: 12,
              color: t.muted,
              lineHeight: 1.7,
            }}
          >
            <Text style={{ margin: 0 }}>
              <Link href="mailto:hello@withjosephine.com" style={{ color: t.ink, textDecoration: "none" }}>
                hello@withjosephine.com
              </Link>
              &nbsp;&middot;&nbsp;
              <Link href="https://withjosephine.com" style={{ color: t.ink, textDecoration: "none" }}>
                withjosephine.com
              </Link>
            </Text>
            <Text style={{ margin: "8px 0 0 0" }}>
              Readings are offered for entertainment and personal reflection.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
