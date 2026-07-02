import { Button, Container, Section } from "@react-email/components";

import type { EmailOrderConfirmationContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type OrderConfirmationVars = {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  dataExportUrl?: string | null;
};

export type OrderConfirmationProps = {
  vars: OrderConfirmationVars;
  copy: EmailOrderConfirmationContent;
  shell?: EmailSharedShellContent;
};

export function OrderConfirmation({ vars, copy: rawCopy, shell = EMAIL_SHARED_SHELL_DEFAULTS }: OrderConfirmationProps) {
  const copy = applyTokens(rawCopy, vars);
  const price = vars.amountPaidDisplay ?? vars.readingPriceDisplay;

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

        {vars.dataExportUrl ? (
          <div style={{ padding: "20px 48px 0 48px" }}>
            <Section className="bg-warm rounded" style={{ padding: "20px 24px" }}>
              <p
                className="font-serif text-ink"
                style={{ margin: "0 0 8px 0", fontSize: 18 }}
              >
                {copy.dataExportHeading}
              </p>
              <p
                className="font-sans text-body"
                style={{ margin: "0 0 16px 0", fontSize: 14, lineHeight: 1.6 }}
              >
                {copy.dataExportBlurb}
              </p>
              <Button
                href={vars.dataExportUrl}
                className="bg-ink text-cream font-sans no-underline"
                style={{
                  padding: "12px 24px",
                  fontSize: 14,
                  borderRadius: 50,
                  letterSpacing: "0.02em",
                }}
              >
                {copy.dataExportButtonLabel}
              </Button>
            </Section>
          </div>
        ) : null}

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
