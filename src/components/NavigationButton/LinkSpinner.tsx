"use client";

import { Loader2 } from "lucide-react";
import { useLinkStatus } from "next/link";

type LinkSpinnerProps = {
  className?: string;
};

export function LinkSpinner({ className }: LinkSpinnerProps) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <Loader2
      aria-hidden="true"
      className={`inline-block w-4 h-4 ml-2 align-middle animate-spin ${className ?? ""}`}
    />
  );
}
