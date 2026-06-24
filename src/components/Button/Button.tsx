import Link from "next/link";
import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";

import { LinkContent } from "@/components/NavigationButton";
import { mergeClasses } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-j-bg-interactive text-j-text-on-dark rounded-[50px] font-body uppercase tracking-[0.12em] font-medium hover:bg-j-midnight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent disabled:opacity-50 disabled:hover:bg-j-bg-interactive",
  outlined:
    "bg-transparent text-j-deep border border-j-accent rounded-[50px] font-body uppercase tracking-[0.12em] font-medium hover:bg-j-accent/10 hover:border-j-deep hover:text-j-midnight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:border-j-accent",
  ghost:
    "bg-transparent text-j-text-muted hover:text-j-accent font-body uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent",
  destructive:
    "bg-j-rose text-j-text-on-dark rounded-[50px] font-body uppercase tracking-[0.12em] font-medium hover:bg-j-rose/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent disabled:opacity-50 disabled:hover:bg-j-rose",
} as const;

const sizeStyles = {
  default: "px-6 py-3 text-[0.82rem]",
  sm: "px-4 py-2 text-[0.75rem]",
  lg: "px-8 py-4 text-[0.88rem]",
} as const;

type ButtonBaseProps = {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  className?: string;
};

type ButtonAsButton = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = ButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = "primary",
  size = "default",
  className,
  href,
  children,
  ...rest
}: ButtonProps) {
  const classes = mergeClasses(variantStyles[variant], sizeStyles[size], className);

  if (href) {
    const restAsAnchor = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    // next/link is only safe for hrefs that resolve to a real in-app page
    // route, where useLinkStatus().pending flips back to false once the
    // client-side navigation completes. Anything that does NOT complete an
    // in-app navigation leaves the spinner stuck pending forever:
    //   - download links (file fetch, not a navigation)
    //   - target="_blank" (opens a new tab, current route never changes)
    //   - /api/* routes (return data/files, not a page render)
    //   - protocol-relative // externals
    const isInAppRoute =
      href.startsWith("/") &&
      !href.startsWith("//") &&
      !href.startsWith("/api/") &&
      !restAsAnchor.download &&
      restAsAnchor.target !== "_blank";

    if (isInAppRoute) {
      return (
        <Link href={href} className={classes} {...restAsAnchor}>
          <LinkContent>{children}</LinkContent>
        </Link>
      );
    }

    return (
      <a href={href} className={classes} {...restAsAnchor}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
