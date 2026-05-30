import { Container, Section } from "@react-email/components";

import type { EmailSharedShellContent, SanityEmailStepUpOtp } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { BrandHeader } from "./BrandHeader";
import { EmailFooter } from "./EmailFooter";
import { EmailShell } from "./EmailShell";

export type StepUpOtpProps = {
  code: string;
  copy: SanityEmailStepUpOtp;
  shell?: EmailSharedShellContent;
};

export function StepUpOtp({
  code,
  copy,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: StepUpOtpProps) {
  return (
    <EmailShell preview={copy.preview} bareContainer>
      <Container
        className="bg-cream border border-divider rounded"
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <BrandHeader shell={shell} />

        <Section
          className="font-serif text-body text-center"
          style={{ padding: "24px 48px 0 48px", fontSize: 32, lineHeight: 1.2 }}
        >
          <p style={{ margin: 0 }}>{copy.heroLine}</p>
        </Section>

        <Section
          className="font-sans text-body"
          style={{ padding: "24px 48px 16px 48px", lineHeight: 1.75, fontSize: 16 }}
        >
          <p style={{ margin: 0 }}>{copy.intro}</p>
        </Section>

        <Section
          className="font-sans text-muted text-center"
          style={{ padding: "8px 48px 4px 48px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}
        >
          <p style={{ margin: 0 }}>{copy.codeLabel}</p>
        </Section>

        <Section style={{ padding: "8px 48px 0 48px", textAlign: "center" }}>
          <p
            className="text-ink"
            style={{
              margin: "0 auto",
              display: "inline-block",
              backgroundColor: "#FAF8F4",
              borderRadius: 8,
              padding: "16px 24px",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              fontSize: 28,
              letterSpacing: "0.25em",
              lineHeight: 1,
            }}
          >
            {code}
          </p>
        </Section>

        <Section
          className="font-sans text-muted"
          style={{ padding: "20px 48px 4px 48px", fontSize: 14, lineHeight: 1.7 }}
        >
          <p style={{ margin: 0 }}>{copy.expiryLine}</p>
        </Section>

        <Section
          className="font-sans text-muted"
          style={{ padding: "12px 48px 8px 48px", fontSize: 14, lineHeight: 1.7 }}
        >
          <p style={{ margin: 0 }}>{copy.closingLine}</p>
        </Section>

        <EmailFooter shell={shell} signoffPaddingTop={20} />
      </Container>
    </EmailShell>
  );
}
