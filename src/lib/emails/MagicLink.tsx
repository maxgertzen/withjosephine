import { Button, Container, Link, Section } from "@react-email/components";

import type { EmailRichText, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { PortableTextBody } from "./PortableTextBody";

export type MagicLinkVars = {
  magicLinkUrl: string;
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
};

export type MagicLinkCopy = {
  preview: string;
  heroLine: string;
  buttonLabel: string;
  body: EmailRichText;
};

export type MagicLinkProps = {
  vars: MagicLinkVars;
  copy: MagicLinkCopy;
  shell?: EmailSharedShellContent;
};

export function MagicLink({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: MagicLinkProps) {
  const copy = applyTokens(rawCopy, vars);
  return (
    <EmailShell preview={copy.preview} bareContainer>
      <Container
        className="bg-cream border border-divider rounded"
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <BrandHeader shell={shell} />

        <GoldHero text={copy.heroLine} />

        <Section
          className="font-sans text-body"
          style={{ padding: "32px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          <PortableTextBody value={copy.body} />
        </Section>

        <div style={{ padding: "8px 48px 8px 48px", textAlign: "center" }}>
          <Button
            href={vars.magicLinkUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 50,
              letterSpacing: "0.02em",
            }}
          >
            {copy.buttonLabel}
          </Button>
        </div>

        <Section
          className="font-sans text-muted text-center"
          style={{ padding: "16px 48px 0 48px", fontSize: 13, lineHeight: 1.6 }}
        >
          <p style={{ margin: 0 }}>
            Or copy this link:{" "}
            <Link href={vars.magicLinkUrl} className="text-ink">
              {vars.magicLinkUrl}
            </Link>
          </p>
        </Section>

        <EmailFooter shell={shell} />
      </Container>
    </EmailShell>
  );
}
