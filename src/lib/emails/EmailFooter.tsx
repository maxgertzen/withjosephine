import { Hr, Link, Section } from "@react-email/components";

import type { EmailSharedShellContent } from "@/data/defaults";

export function EmailFooter({
  shell,
  signoffPaddingTop = 36,
}: {
  shell: EmailSharedShellContent;
  signoffPaddingTop?: number;
}) {
  return (
    <>
      <Section
        className="font-serif italic text-ink"
        style={{ padding: `${signoffPaddingTop}px 48px 16px 48px`, fontSize: 22, lineHeight: 1.4 }}
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
    </>
  );
}
