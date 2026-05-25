import { Container, Section } from "@react-email/components";

import type { EmailGiftPurchaseConfirmationScheduledContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { hasBodyContent, PortableTextBody, PortableTextInline } from "./PortableTextBody";

export type GiftPurchaseConfirmationScheduledVars = {
  purchaserFirstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  recipientName: string | null;
  giftMessage: string | null;
  myGiftsUrl: string;
  sendAtDisplay: string;
};

export type GiftPurchaseConfirmationScheduledProps = {
  vars: GiftPurchaseConfirmationScheduledVars;
  copy: EmailGiftPurchaseConfirmationScheduledContent;
  shell?: EmailSharedShellContent;
};

function priceCell(vars: GiftPurchaseConfirmationScheduledVars): string {
  return vars.amountPaidDisplay ?? vars.readingPriceDisplay;
}

export function GiftPurchaseConfirmationScheduled({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: GiftPurchaseConfirmationScheduledProps) {
  const tokens = {
    ...vars,
    recipientName: vars.recipientName ?? "your recipient",
  };
  const copy = applyTokens(rawCopy, tokens);
  const price = priceCell(vars);
  const useFoldedBody = hasBodyContent(copy.body);

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
          {useFoldedBody ? (
            <PortableTextBody value={copy.body} />
          ) : (
            <>
              <p style={{ margin: "0 0 18px 0" }}>{copy.greeting}</p>
              <p style={{ margin: "0 0 18px 0" }}>
                <PortableTextInline value={copy.detailLineScheduled} />
              </p>
            </>
          )}
        </Section>

        <div style={{ padding: "16px 48px 0 48px" }}>
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
            <p className="font-sans text-body" style={{ margin: 0, fontSize: 14 }}>
              <span className="text-muted">{copy.cardDeliveryLine}</span>
              &nbsp;&middot;&nbsp;
              <span>{price}</span>
            </p>
          </Section>
        </div>

        <Section
          className="font-sans text-body"
          style={{ padding: "24px 48px 0 48px", lineHeight: 1.7, fontSize: 14 }}
        >
          <p style={{ margin: 0 }}>
            <PortableTextInline value={copy.refundLine} />
          </p>
        </Section>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
