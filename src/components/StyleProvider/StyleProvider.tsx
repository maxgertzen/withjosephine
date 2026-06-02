import { bodyFont, displayFont } from "@/lib/fonts.generated";

export const styleProviderClassName = `${displayFont.variable} ${bodyFont.variable}`;

export function StyleProvider({ children }: { children: React.ReactNode }) {
  return <div className={styleProviderClassName}>{children}</div>;
}
