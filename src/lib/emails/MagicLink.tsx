import type { EmailSharedShellContent } from "@/data/defaults";

import { OneButtonEmail, type OneButtonEmailProps } from "./OneButtonEmail";

export type MagicLinkVars = {
  magicLinkUrl: string;
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
};

export type MagicLinkCopy = OneButtonEmailProps["copy"];

export type MagicLinkProps = {
  vars: MagicLinkVars;
  copy: MagicLinkCopy;
  shell?: EmailSharedShellContent;
};

export function MagicLink({ vars, copy, shell }: MagicLinkProps) {
  return <OneButtonEmail buttonUrl={vars.magicLinkUrl} vars={vars} copy={copy} shell={shell} />;
}
