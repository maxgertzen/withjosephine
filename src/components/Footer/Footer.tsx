import Image from "next/image";
import Link from "next/link";

import { FOOTER_DEFAULTS, type FooterContent } from "@/data/defaults";
import { ROUTES } from "@/lib/constants";
import type { MappedSocialLink } from "@/lib/sanity/mappers";
import { mergeClasses } from "@/lib/utils";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter",
  youtube: "YouTube",
  email: "Email",
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.7a8.16 8.16 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.13Z" />
    </svg>
  );
}

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
  const { brandName, logoUrl, copyrightText } = { ...FOOTER_DEFAULTS, ...content };

  return (
    <footer
      className={mergeClasses("border-t border-j-border-subtle py-8 px-6 text-center", className)}
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
        <div className="flex justify-center items-center gap-5 mb-4">
          {socialLinks.map((link) => {
            const isEmail = link.platform === "email";

            if (link.platform === "tiktok") {
              return (
                <a
                  key={link.platform}
                  href={link.url}
                  aria-label={link.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-j-text-muted hover:text-j-accent transition-colors opacity-60 hover:opacity-100"
                >
                  <TikTokIcon className="w-8 h-8" />
                </a>
              );
            }

            return (
              <a
                key={link.platform}
                href={link.url}
                aria-label={link.label}
                className="text-j-text-muted hover:text-j-accent transition-colors opacity-60 hover:opacity-100"
                {...(isEmail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              >
                <span className="font-body text-xs tracking-wide">
                  {SOCIAL_LABELS[link.platform] ?? link.label}
                </span>
              </a>
            );
          })}
        </div>
      )}

      <nav aria-label="Legal" className="flex justify-center flex-wrap gap-x-5 gap-y-2 mb-4">
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
      <p className="text-[0.68rem] text-j-text-muted tracking-[0.06em] opacity-40 font-body mt-2">
        Built by{" "}
        <a
          href="https://maxgertzen.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-j-accent transition-colors"
        >
          Max Gertzen
        </a>
      </p>
    </footer>
  );
}
