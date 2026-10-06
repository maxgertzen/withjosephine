import { Container, Section } from "@react-email/components";

import type {
  EmailGiftRecipientConfirmationContent,
  EmailSharedShellContent,
} from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens, type TokenVars } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { DataExportLine } from "./DataExportLine";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";
import { ReadingCard } from "./ReadingCard";

export type GiftRecipientConfirmationVars = {
  firstName: string;
  buyerFirstName: string;
  readingName: string;
  dataExportUrl: string | null;
};

export type GiftRecipientConfirmationProps = {
  vars: GiftRecipientConfirmationVars;
  copy: EmailGiftRecipientConfirmationContent;
  shell?: EmailSharedShellContent;
};

export function giftRecipientConfirmationTokens(
  vars: GiftRecipientConfirmationVars,
  copy: Pick<EmailGiftRecipientConfirmationContent, "buyerNameFallback">,
): TokenVars {
  return {
    firstName: vars.firstName,
    buyerName: vars.buyerFirstName || copy.buyerNameFallback,
    readingName: vars.readingName,
  };
}

export function GiftRecipientConfirmation({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: GiftRecipientConfirmationProps) {
  const copy = applyTokens(rawCopy, giftRecipientConfirmationTokens(vars, rawCopy));

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

        <ReadingCard label={copy.cardLabel} readingName={vars.readingName}>
          <p className="font-sans text-muted-warm" style={{ margin: 0, fontSize: 14 }}>
            {copy.cardDeliveryLine}
          </p>
        </ReadingCard>

        <EmailFooter shell={shell} />

        <DataExportLine
          url={vars.dataExportUrl}
          heading={copy.dataExportHeading}
          buttonLabel={copy.dataExportButtonLabel}
        />
      </Container>
    </EmailShell>
  );
}
