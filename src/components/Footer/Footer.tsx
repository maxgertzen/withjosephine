import Image from "next/image";
import Link from "next/link";
import { mergeClasses } from "@/lib/utils";
import { ROUTES } from "@/lib/constants";
import type { MappedSocialLink } from "@/lib/sanity/mappers";

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

const SOCIAL_ICONS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  youtube: "YouTube",
  email: "Email",
};

const LEGAL_LINKS = [
  { label: "Privacy", href: ROUTES.privacy },
  { label: "Terms", href: ROUTES.terms },
  { label: "Refunds", href: ROUTES.refundPolicy },
] as const;

interface FooterProps {
  content?: FooterContent;
  socialLinks?: MappedSocialLink[];
  className?: string;
}

export function Footer({ content, socialLinks, className }: FooterProps) {
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

      {socialLinks && socialLinks.length > 0 && (
        <div className="flex justify-center gap-5 mb-4">
          {socialLinks.map((link) => {
            const isEmail = link.platform === "email";

            return (
              <a
                key={link.platform}
                href={link.url}
                aria-label={link.label}
                className="text-j-text-muted hover:text-j-accent transition-colors opacity-60 hover:opacity-100"
                {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              >
                <span className="font-body text-xs tracking-wide">
                  {SOCIAL_ICONS[link.platform] ?? link.label}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <nav
        aria-label="Legal"
        className="flex justify-center flex-wrap gap-x-5 gap-y-2 mb-4"
      >
        {LEGAL_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-body text-xs tracking-wide text-j-text-muted hover:text-j-accent transition-colors opacity-60 hover:opacity-100"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="text-[0.72rem] text-j-text-muted tracking-[0.06em] opacity-60 font-body">
        &copy; {new Date().getFullYear()} {copyrightText}
      </p>
    </footer>
  );
}
