"use client";

import * as NextLink from "next/link";
import type { ReactNode } from "react";

import { Loader } from "@/components/Loader";

// Defensive: Next 16+ exports useLinkStatus from "next/link". Older mocks
// (@storybook/nextjs's framework mock, ad-hoc test stubs) may not.
// In those contexts the spinner is irrelevant anyway (no real navigation),
// so falling back to a no-op pending: false keeps the render path safe.
const useLinkStatusSafe: () => { pending: boolean } =
  (NextLink as { useLinkStatus?: () => { pending: boolean } }).useLinkStatus ??
  (() => ({ pending: false }));

type LinkContentProps = {
  children: ReactNode;
  pendingLabel?: string;
};

export function LinkContent({ children, pendingLabel = "Loading" }: LinkContentProps) {
  const { pending } = useLinkStatusSafe();
  if (!pending) return <>{children}</>;
  return (
    <span className="relative inline-flex items-center justify-center">
      <span aria-hidden="true" className="invisible">
        {children}
      </span>
      <span className="absolute inset-0 inline-flex items-center justify-center">
        <Loader size={16} label={pendingLabel} />
      </span>
    </span>
  );
}
