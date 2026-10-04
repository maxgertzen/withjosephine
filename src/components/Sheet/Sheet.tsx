"use client";

import { type ReactNode, useRef } from "react";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);
  useFocusTrap({ active: open, containerRef: panelRef, onEscape: onClose });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <div
        aria-hidden="true"
        data-testid="sheet-dim"
        onClick={onClose}
        className="absolute inset-0 bg-j-midnight/45 j-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-j-cream px-[22px] pt-[22px] pb-[26px] shadow-[0_-8px_30px_rgba(13,11,26,0.25)] focus:outline-none"
      >
        <div aria-hidden="true" className="h-1 w-10 shrink-0 self-center rounded bg-j-blush" />
        {children}
      </div>
    </div>
  );
}
