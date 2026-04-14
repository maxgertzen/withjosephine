import { type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { mergeClasses } from "@/lib/utils";

const variantStyles = {
  primary:
    "bg-j-bg-interactive text-j-text-on-dark rounded-[50px] font-body uppercase tracking-[0.12em] font-medium hover:bg-j-midnight transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent",
  ghost:
    "bg-transparent text-j-text-muted hover:text-j-accent font-body uppercase tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-accent",
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
    return (
      <a
        href={href}
        className={classes}
        {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
