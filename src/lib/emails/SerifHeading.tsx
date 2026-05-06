import { Heading } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

import { emailTokens as t } from "@/lib/theme/email-tokens.generated";

/**
 * `<Heading>` styled with the brand serif family + ink color. Every
 * notification-style email uses this; consolidating prevents drift on
 * font/color across components.
 */
export type SerifHeadingProps = {
  as?: "h1" | "h2";
  style?: CSSProperties;
  children: ReactNode;
};

export function SerifHeading({ as = "h1", style, children }: SerifHeadingProps) {
  return (
    <Heading
      as={as}
      style={{ fontFamily: t.serifFamily, color: t.ink, ...style }}
    >
      {children}
    </Heading>
  );
}
