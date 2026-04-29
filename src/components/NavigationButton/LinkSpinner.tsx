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
    <span aria-label={pendingLabel} className="inline-flex items-center justify-center gap-2">
      <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
    </span>
  );
}

