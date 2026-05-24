"use client";

import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

import { Loader } from "@/components/Loader";

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
      <span className="absolute inset-0 inline-flex items-center justify-center">
        <Loader size={16} label={pendingLabel} />
      </span>
    </span>
  );
}
