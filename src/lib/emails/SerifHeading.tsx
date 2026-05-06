import { Heading } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/**
 * `<Heading>` styled with the brand serif family + ink color via the
 * `<Tailwind>` provider's brand tokens. Centralized so a token edit
 * propagates everywhere.
 */
export type SerifHeadingProps = {
  as?: "h1" | "h2";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function SerifHeading({ as = "h1", className, style, children }: SerifHeadingProps) {
  const baseClass = "font-serif text-ink";
  const fullClass = className ? `${baseClass} ${className}` : baseClass;
  return (
    <Heading as={as} className={fullClass} style={style}>
      {children}
    </Heading>
  );
}
