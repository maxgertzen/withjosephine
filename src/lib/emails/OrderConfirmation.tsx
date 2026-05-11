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

import type { EmailOrderConfirmationContent } from "@/data/defaults";

import { emailTailwindConfig } from "./theme.config";

export type OrderConfirmationVars = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
};

export type OrderConfirmationProps = {
  vars: OrderConfirmationVars;
  copy: EmailOrderConfirmationContent;
};

function template(text: string, vars: OrderConfirmationVars): string {
  return text
    .replaceAll("{firstName}", vars.firstName)
    .replaceAll("{readingName}", vars.readingName);
}

function priceCell(vars: OrderConfirmationVars): string {
  return vars.amountPaidDisplay ?? vars.readingPriceDisplay;
}

export function OrderConfirmation({ vars, copy }: OrderConfirmationProps) {
  const price = priceCell(vars);

  return (
    <Html lang="en">
      <Head />
      <Preview>{copy.preview}</Preview>
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-warm m-0 p-0">
          <Container
            className="bg-cream border border-divider rounded"
            style={{ maxWidth: 600, margin: "0 auto" }}
          >

            <Section className="text-center" style={{ padding: "44px 48px 8px 48px" }}>
              <p
                className="font-serif text-ink"
                style={{ margin: 0, fontWeight: 500, fontSize: 38, lineHeight: 1, letterSpacing: "0.005em" }}
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
                      style={{ padding: "0 16px", fontWeight: 500, fontSize: 28, lineHeight: 1.2, whiteSpace: "nowrap" }}
                    >
                      {copy.heroLine}
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
              <p style={{ margin: "0 0 18px 0" }}>{template(copy.thanksLine, vars)}</p>
              <p style={{ margin: "0 0 18px 0" }}>{copy.timelineLine}</p>
              <p style={{ margin: "0 0 32px 0" }}>{copy.contactLine}</p>
            </Section>


            <div style={{ padding: "0 48px" }}>
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
                <p
                  className="font-sans text-body"
                  style={{ margin: 0, fontSize: 14 }}
                >
                  <span className="text-muted">{copy.cardDeliveryLine}</span>
                  &nbsp;&middot;&nbsp;
                  <span>{price}</span>
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
