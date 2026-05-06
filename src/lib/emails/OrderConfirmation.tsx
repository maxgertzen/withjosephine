import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
} from "@react-email/components";

import { emailTailwindConfig } from "./theme.config";

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

// The folio layout is bespoke — masthead, gold-rule title, body, inset
// price card, signature, footer — each section has unique typography that
// doesn't share a common shape with the simpler emails. Plain `<p>` tags
// inherit font-size from each parent `<Section>`'s style, which keeps the
// per-section typography clean. Brand tokens (colors, fonts) flow through
// the `<Tailwind>` provider's classNames; layout-specific values stay
// inline.
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
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-warm m-0 p-0">
          <Container
            className="bg-cream border border-divider rounded"
            style={{ maxWidth: 600, margin: "0 auto" }}
          >
            {/* Header */}
            <Section className="text-center" style={{ padding: "44px 48px 8px 48px" }}>
              <p
                className="font-serif text-ink"
                style={{ margin: 0, fontWeight: 500, fontSize: 38, lineHeight: 1, letterSpacing: "0.005em" }}
              >
                Josephine
              </p>
              <p
                className="font-sans text-muted uppercase"
                style={{ margin: "10px 0 0 0", fontSize: 11, letterSpacing: "0.32em" }}
              >
                Soul Readings
              </p>
            </Section>

            {/* Title with gold rule lines */}
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
                      style={{ padding: "0 16px", fontWeight: 500, fontSize: 28, lineHeight: 1.2, whiteSpace: "nowrap" }}
                    >
                      Your reading is booked
                    </td>
                    <td width="18%">
                      <div className="border-t border-gold" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Body */}
            <Section
              className="font-sans text-body"
              style={{ padding: "32px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
            >
              <p style={{ margin: "0 0 18px 0" }}>Hi {firstName},</p>
              <p style={{ margin: "0 0 18px 0" }}>
                Thank you for booking a {readingName} with me. I have your intake and your payment, and you don&apos;t need to do anything else.
              </p>
              <p style={{ margin: "0 0 18px 0" }}>
                I&apos;ll begin your reading in the next day or two. You&apos;ll hear a short note from me when I do, just so you know it&apos;s underway. Your voice note and PDF will arrive within seven days, to this email address.
              </p>
              <p style={{ margin: "0 0 32px 0" }}>
                If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.
              </p>
            </Section>

            {/* Inset price card */}
            <div style={{ padding: "0 48px" }}>
              <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
                <p
                  className="font-sans text-muted uppercase"
                  style={{ margin: "0 0 4px 0", fontSize: 11, letterSpacing: "0.18em" }}
                >
                  Your reading
                </p>
                <p
                  className="font-serif text-ink"
                  style={{ margin: "0 0 12px 0", fontSize: 22 }}
                >
                  {readingName}
                </p>
                <p
                  className="font-sans text-body"
                  style={{ margin: 0, fontSize: 14 }}
                >
                  <span className="text-muted">Delivery within 7 days</span>
                  &nbsp;&middot;&nbsp;
                  <span>{price}</span>
                </p>
              </Section>
            </div>

            {/* Signature */}
            <Section
              className="font-serif italic text-ink"
              style={{ padding: "36px 48px 16px 48px", fontSize: 22, lineHeight: 1.4 }}
            >
              <p style={{ margin: "0 0 4px 0" }}>With love,</p>
              <p style={{ margin: 0 }}>
                Josephine <span className="text-gold">✦</span>
              </p>
            </Section>

            {/* Footer */}
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
              <p style={{ margin: "8px 0 0 0" }}>
                Readings are offered for entertainment and personal reflection.
              </p>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
