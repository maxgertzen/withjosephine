"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export type PopoverPosition = { top: number; left: number; width: number };

/**
 * Hook for picker/dropdown popovers that need to escape every ancestor
 * stacking context (overflow:hidden, transformed labels, z-indexed mains).
 * Pair with `createPortal(..., document.body)` so the popover paints at the
 * document root, then position it from the anchor's bounding rect.
 */
export function usePopoverPortal({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
}) {
  const popoverEl = useRef<HTMLElement | null>(null);
  const popoverRef = useCallback((el: HTMLElement | null) => {
    popoverEl.current = el;
  }, []);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (popoverEl.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open, anchorRef]);

  return { popoverRef, position };
}
