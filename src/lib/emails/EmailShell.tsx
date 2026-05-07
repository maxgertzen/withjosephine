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
