import Image from "next/image";
import { mergeClasses } from "@/lib/utils";

interface FooterContent {
  brandName: string;
  logoUrl?: string;
  copyrightText: string;
}

const FOOTER_DEFAULTS: FooterContent = {
  brandName: "Josephine",
  logoUrl: "/images/logo-default.png",
  copyrightText: "Josephine. All rights reserved.",
};

interface FooterProps {
  content?: FooterContent;
  className?: string;
}

export function Footer({ content, className }: FooterProps) {
  const { brandName, logoUrl, copyrightText } = content ?? FOOTER_DEFAULTS;

  return (
    <footer
      className={mergeClasses(
        "border-t border-j-border-subtle py-8 px-6 text-center",
        className,
      )}
    >
      {logoUrl && (
        <Image
          src={logoUrl}
          alt={brandName}
          width={80}
          height={80}
          className="mx-auto mb-4 opacity-60"
        />
      )}
      <p className="text-[0.72rem] text-j-text-muted tracking-[0.06em] opacity-60 font-body">
        &copy; {new Date().getFullYear()} {copyrightText}
      </p>
    </footer>
  );
}
