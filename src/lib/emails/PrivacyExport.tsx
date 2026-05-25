import { Button, Container, Section } from "@react-email/components";

import type { EmailPrivacyExportContent, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { applyTokens } from "./applyTokens";
import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";
import { GoldHero } from "./GoldHero";
import { hasBodyContent, PortableTextBody, PortableTextInline } from "./PortableTextBody";

export type PrivacyExportVars = {
  downloadUrl: string;
  submissionCount: number;
  expiryDays: number;
};

export type PrivacyExportProps = {
  vars: PrivacyExportVars;
  copy: EmailPrivacyExportContent;
  shell?: EmailSharedShellContent;
};

export function PrivacyExport({
  vars,
  copy: rawCopy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: PrivacyExportProps) {
  const copy = applyTokens(rawCopy, vars);
  const useFoldedIntro = hasBodyContent(copy.bodyIntro);
  const useFoldedPost = hasBodyContent(copy.bodyPostButton);

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
          {useFoldedIntro ? (
            <PortableTextBody value={copy.bodyIntro} />
          ) : (
            <>
              <p style={{ margin: "0 0 18px 0" }}>{copy.greeting}</p>
              <p style={{ margin: "0 0 18px 0" }}>
                <PortableTextInline value={copy.introLine} />
              </p>
              <p style={{ margin: "0 0 18px 0" }}>
                <PortableTextInline value={copy.contentsLine} />
              </p>
            </>
          )}
        </Section>

        <div style={{ padding: "8px 48px 8px 48px", textAlign: "center" }}>
          <Button
            href={vars.downloadUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 50,
              letterSpacing: "0.02em",
            }}
          >
            {copy.ctaLabel}
          </Button>
        </div>

        <Section
          className="font-sans text-body"
          style={{ padding: "24px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          {useFoldedPost ? (
            <PortableTextBody value={copy.bodyPostButton} />
          ) : (
            <p style={{ margin: 0 }}>
              <PortableTextInline value={copy.expiryLine} />
            </p>
          )}
        </Section>

        <EmailFooter shell={shell} signoffPaddingTop={20} />
      </Container>
    </EmailShell>
  );
}
