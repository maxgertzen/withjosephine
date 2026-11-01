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

function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  );
}

interface SocialLinksProps {
  links: MappedSocialLink[];
  linkClassName: string;
  className?: string;
  emailAsIcon?: boolean;
}

export function SocialLinks({ links, linkClassName, className, emailAsIcon = false }: SocialLinksProps) {
  if (links.length === 0) return null;

  return (
    <div className={mergeClasses("flex justify-center items-center gap-5", className)}>
      {links.map((link) => {
        const opensNewTab = link.platform !== "email";
        return (
          <a
            key={link.platform}
            href={link.url}
            aria-label={link.label}
            className={linkClassName}
            {...(opensNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.platform === "tiktok" ? (
              <TikTokIcon className="w-8 h-8" />
            ) : emailAsIcon && link.platform === "email" ? (
              <MailIcon className="w-8 h-8" />
            ) : (
              <span className="font-body text-xs tracking-wide">
                {SOCIAL_LABELS[link.platform] ?? link.label}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
