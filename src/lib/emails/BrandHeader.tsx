import { Section } from "@react-email/components";

import type { EmailSharedShellContent } from "@/data/defaults";

export function BrandHeader({ shell }: { shell: EmailSharedShellContent }) {
  return (
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
  );
}
