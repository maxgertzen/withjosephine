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
  /** When true, skip the wrapping Container so the consumer can render its own. */
  bareContainer?: boolean;
  bodyClassName?: string;
  children: ReactNode;
};

const DEFAULT_BODY_CLASS = "bg-warm text-body font-sans m-0 p-0";
const BARE_BODY_CLASS = "bg-warm m-0 p-0";

export function EmailShell({
  preview,
  maxWidth = 560,
  bareContainer = false,
  bodyClassName,
  children,
}: EmailShellProps) {
  const resolvedBodyClass =
    bodyClassName ?? (bareContainer ? BARE_BODY_CLASS : DEFAULT_BODY_CLASS);
  return (
    <Html lang="en">
      <Head />
      {preview ? <Preview>{preview}</Preview> : null}
      <Tailwind config={emailTailwindConfig}>
        <Body className={resolvedBodyClass}>
          {bareContainer ? (
            children
          ) : (
            <Container
              className="font-sans text-body"
              style={{ maxWidth, margin: "0 auto", padding: "32px 16px", lineHeight: 1.7 }}
            >
              {children}
            </Container>
          )}
        </Body>
      </Tailwind>
    </Html>
  );
}
