import Image from "next/image";
import Link from "next/link";

import { SocialLinks } from "@/components/SocialLinks";
import { FOOTER_DEFAULTS, type FooterContent } from "@/data/defaults";
import { ROUTES } from "@/lib/constants";
import { type Overrides, withNonBlankOverrides } from "@/lib/content/nonBlank";
import type { NotesLink } from "@/lib/notes/notes";
import type { MappedSocialLink } from "@/lib/sanity/mappers";
import { mergeClasses } from "@/lib/utils";

import { NewsletterSlot } from "./NewsletterContext";

const LEGAL_LINKS = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Refunds", href: ROUTES.refundPolicy },
] as const;

const FOOTER_LINK_CLASSES =
  "text-j-text-muted hover:text-j-text-gold transition-colors opacity-60 hover:opacity-100";

interface FooterProps {
  content?: Overrides<FooterContent>;
  socialLinks?: MappedSocialLink[];
  notesLink?: NotesLink;
  className?: string;
}

export function Footer({ content, socialLinks, notesLink, className }: FooterProps) {
  const links = notesLink ? [notesLink, ...LEGAL_LINKS] : LEGAL_LINKS;
  const { brandName, logoUrl, copyrightText } = withNonBlankOverrides(FOOTER_DEFAULTS, content);

  return (
    <footer
      className={mergeClasses("border-t border-j-border-subtle py-8 px-6 text-center", className)}
    >
      <NewsletterSlot />

      <Image src={logoUrl} alt={brandName} width={80} height={80} className="mx-auto mb-4 opacity-60" />

      <SocialLinks links={socialLinks ?? []} linkClassName={FOOTER_LINK_CLASSES} className="mb-4" />

      <nav aria-label="Footer" className="flex justify-center flex-wrap gap-x-5 gap-y-2 mb-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-body text-xs tracking-wide ${FOOTER_LINK_CLASSES}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="text-[0.72rem] text-j-text-muted tracking-[0.06em] opacity-60 font-body">
        &copy; {new Date().getFullYear()} {copyrightText}
      </p>
      <p className="text-[0.68rem] text-j-text-muted tracking-[0.06em] opacity-40 font-body mt-2">
        Built by{" "}
        <a
          href="https://maxgertzen.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-j-text-gold transition-colors"
        >
          Max Gertzen
        </a>
      </p>
    </footer>
  );
}
