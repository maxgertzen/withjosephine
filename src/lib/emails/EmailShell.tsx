import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from "@react-email/components";
import type { ReactNode } from "react";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

/**
 * Shared envelope for every transactional email — sets the document
 * structure email clients need (`<Html>`, `<Head>`, `<Body>`) and the brand
 * surface that wraps the body content.
 */
export type EmailShellProps = {
  preview?: string;
  maxWidth?: number;
  children: ReactNode;
};

export function EmailShell({ preview, maxWidth = 560, children }: EmailShellProps) {
  return (
    <Html lang="en">
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Body
        style={{
          fontFamily: t.sansFamily,
          color: t.body,
          backgroundColor: t.warm,
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth,
            margin: "0 auto",
            padding: "32px 16px",
            lineHeight: 1.7,
          }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}
