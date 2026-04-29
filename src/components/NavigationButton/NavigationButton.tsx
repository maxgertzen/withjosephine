import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { LinkContent } from "./LinkSpinner";

type NavigationButtonProps = Omit<ComponentProps<typeof Link>, "children"> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function NavigationButton({
  children,
  pendingLabel,
  ...linkProps
}: NavigationButtonProps) {
  return (
    <Link {...linkProps}>
      <LinkContent pendingLabel={pendingLabel}>{children}</LinkContent>
    </Link>
  );
}
