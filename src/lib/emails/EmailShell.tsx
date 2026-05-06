import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";

import { emailTailwindConfig } from "./theme.config";

/**
 * Shared envelope for every transactional email — sets the document
 * structure email clients need (`<Html>`, `<Head>`, `<Body>`) and wraps
 * children in the brand-themed `<Tailwind>` provider so child components
 * can use brand-token utility classes (`text-ink`, `font-serif`, etc.).
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
      <Tailwind config={emailTailwindConfig}>
        <Body className="bg-warm text-body font-sans m-0 p-0">
          <Container
            className="font-sans text-body"
            style={{ maxWidth, margin: "0 auto", padding: "32px 16px", lineHeight: 1.7 }}
          >
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
