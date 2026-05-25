import { Button, Container, Hr, Link, Section } from "@react-email/components";

import type { EmailRichText, EmailSharedShellContent } from "@/data/defaults";
import { EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { EmailShell } from "./EmailShell";
import { PortableTextBody } from "./PortableTextBody";

export type MagicLinkProps = {
  magicLinkUrl: string;
  preview: string;
  heroLine: string;
  buttonLabel: string;
  greeting?: string | null;
  body: EmailRichText;
  shell?: EmailSharedShellContent;
};

export function MagicLink({
  magicLinkUrl,
  preview,
  heroLine,
  buttonLabel,
  greeting,
  body,
  shell = EMAIL_SHARED_SHELL_DEFAULTS,
}: MagicLinkProps) {
  return (
    <EmailShell preview={preview} bareContainer>
      <Container
        className="bg-cream border border-divider rounded"
        style={{ maxWidth: 600, margin: "0 auto" }}
      >
        <Section className="text-center" style={{ padding: "44px 48px 8px 48px" }}>
          <p
            className="font-serif text-ink"
            style={{ margin: 0, fontWeight: 500, fontSize: 38, lineHeight: 1, letterSpacing: "0.005em" }}
          >
            {shell.brandName}
          </p>
          <p
            className="font-sans text-muted uppercase"
            style={{ margin: "10px 0 0 0", fontSize: 11, letterSpacing: "0.32em" }}
          >
            {shell.brandSubtitle}
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
                  style={{ padding: "0 16px", fontWeight: 500, fontSize: 28, lineHeight: 1.2 }}
                >
                  {heroLine}
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
          {greeting ? <p style={{ margin: "0 0 18px 0" }}>{greeting}</p> : null}
          <PortableTextBody value={body} />
        </Section>

        <div style={{ padding: "8px 48px 8px 48px", textAlign: "center" }}>
          <Button
            href={magicLinkUrl}
            className="bg-ink text-cream font-sans no-underline"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 50,
              letterSpacing: "0.02em",
            }}
          >
            {buttonLabel}
          </Button>
        </div>

        <Section
          className="font-sans text-muted text-center"
          style={{ padding: "16px 48px 0 48px", fontSize: 13, lineHeight: 1.6 }}
        >
          <p style={{ margin: 0 }}>
            Or copy this link:{" "}
            <Link href={magicLinkUrl} className="text-ink">
              {magicLinkUrl}
            </Link>
          </p>
        </Section>

        <Section
          className="font-serif italic text-ink"
          style={{ padding: "36px 48px 16px 48px", fontSize: 22, lineHeight: 1.4 }}
        >
          <p style={{ margin: "0 0 4px 0" }}>{shell.signOffLine1}</p>
          <p style={{ margin: 0 }}>{shell.signOffLine2}</p>
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
          <p style={{ margin: "8px 0 0 0" }}>{shell.footerDisclaimer}</p>
        </Section>
      </Container>
    </EmailShell>
  );
}
