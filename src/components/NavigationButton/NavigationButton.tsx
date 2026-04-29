import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { LinkSpinner } from "./LinkSpinner";

type NavigationButtonProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  spinnerClassName?: string;
};

export function NavigationButton({
  children,
  spinnerClassName,
  ...linkProps
}: NavigationButtonProps) {
  return (
    <Link {...linkProps}>
      {children}
      <LinkSpinner className={spinnerClassName} />
    </Link>
  );
}
