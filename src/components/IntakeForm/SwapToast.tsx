"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

type SwapToastProps = {
  readingName: string;
  template?: string;
  durationMs?: number;
  onDismiss?: () => void;
};

const DEFAULT_TEMPLATE =
  "Switched to {readingName}. Your name and email are saved \u2014 start where you left off.";

export function SwapToast({
  readingName,
  template = DEFAULT_TEMPLATE,
  durationMs = 4000,
  onDismiss,
}: SwapToastProps) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      setOpen(false);
      onDismiss?.();
    }, durationMs);
    return () => clearTimeout(handle);
  }, [open, durationMs, onDismiss]);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 max-w-md mx-auto px-6 py-3 bg-j-ivory border border-j-border-gold rounded-md shadow-j-card flex items-center gap-3 motion-safe:j-fade-in motion-reduce:animate-none"
    >
      <span aria-hidden="true" className="text-j-accent shrink-0">
        ✦
      </span>
      <p className="font-display italic text-sm text-j-text-heading flex-1">
        {template.replaceAll("{readingName}", readingName)}
      </p>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          onDismiss?.();
        }}
        className="shrink-0 p-1 text-j-text-muted hover:text-j-text-heading transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
