import { EMAIL_COPY_LINK_LABEL_DEFAULT, type EmailRichText, type EmailSharedShellContent } from "@/data/defaults";

import { OneButtonEmail } from "./OneButtonEmail";

export type MagicLinkVars = {
  magicLinkUrl: string;
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
};

export type MagicLinkCopy = {
  preview: string;
  heroLine: string;
  buttonLabel: string;
  body: EmailRichText;
};

export type MagicLinkProps = {
  vars: MagicLinkVars;
  copy: MagicLinkCopy;
  shell?: EmailSharedShellContent;
};

export function MagicLink({ vars, copy, shell }: MagicLinkProps) {
  return <OneButtonEmail buttonUrl={vars.magicLinkUrl} vars={vars} copy={{ ...copy, copyLinkLabel: EMAIL_COPY_LINK_LABEL_DEFAULT }} shell={shell} />;
}
