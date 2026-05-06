import { Heading } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

export type SerifHeadingProps = {
  as?: "h1" | "h2";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function SerifHeading({ as = "h1", className, style, children }: SerifHeadingProps) {
  return (
    <Heading as={as} className={`font-serif text-ink ${className ?? ""}`.trim()} style={style}>
      {children}
    </Heading>
  );
}
