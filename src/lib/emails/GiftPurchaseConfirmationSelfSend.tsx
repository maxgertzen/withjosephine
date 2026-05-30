import { Button, Container, Link, Section } from "@react-email/components";

import type { EmailGiftPurchaseConfirmationSelfSendContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { LibraryButton } from "./LibraryButton";
import { PortableTextBody, PortableTextInline } from "./PortableTextBody";

export type GiftPurchaseConfirmationSelfSendVars = {
  purchaserFirstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  recipientName: string | null;
  giftMessage: string | null;
  myGiftsUrl: string;
  libraryUrl?: string;
  claimUrl: string;
};

export type GiftPurchaseConfirmationSelfSendProps = {
  vars: GiftPurchaseConfirmationSelfSendVars;
  copy: EmailGiftPurchaseConfirmationSelfSendContent;
  shell?: EmailSharedShellContent;
};

export function GiftPurchaseConfirmationSelfSend({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: GiftPurchaseConfirmationSelfSendProps) {
  const tokens = {
    ...vars,
    recipientName: vars.recipientName ?? "your recipient",
  };
  const copy = applyTokens(rawCopy, tokens);
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

        <div style={{ padding: "0 48px 8px 48px", textAlign: "center" }}>
          <Button
            href={vars.claimUrl}
            className="bg-ink text-cream font-sans no-underline rounded"
            style={{
              padding: "14px 28px",
              fontSize: 15,
              letterSpacing: "0.08em",
            }}
          >
            {copy.shareButtonLabel}
          </Button>
          <p
            className="font-sans text-muted"
            style={{ margin: "16px 0 0 0", fontSize: 13, lineHeight: 1.6 }}
          >
            <PortableTextInline value={copy.shareUrlHelper} />
          </p>
          <p
            className="font-sans"
            style={{
              margin: "8px 0 0 0",
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            <Link href={vars.claimUrl} className="text-gold underline">
              {vars.claimUrl}
            </Link>
          </p>
        </div>

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

        <LibraryButton libraryUrl={vars.libraryUrl} label={copy.libraryButtonLabel} variant="secondary" />

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
