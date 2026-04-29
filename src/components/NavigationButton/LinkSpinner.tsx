"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

type LinkContentProps = {
  children: ReactNode;
  pendingLabel?: string;
};

export function LinkContent({ children, pendingLabel = "Loading" }: LinkContentProps) {
  const { pending } = useLinkStatus();
  if (!pending) return <>{children}</>;
  return (
    <span className="relative inline-flex items-center justify-center">
      <span aria-hidden="true" className="invisible">
        {children}
      </span>
      <span
        aria-label={pendingLabel}
        role="status"
        className="absolute inset-0 inline-flex items-center justify-center"
      >
        <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
      </span>
    </span>
  );
}
