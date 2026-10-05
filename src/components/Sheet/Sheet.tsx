"use client";

import {
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useIsClient } from "@/lib/hooks/useIsClient";
import { mergeClasses } from "@/lib/utils";

const SHEET_TRANSITION_MS = 300;
const SHEET_TRANSITION_CLASSES = "duration-300 ease-out motion-reduce:transition-none";
export const SHEET_SWIPE_CLOSE_PX = 80;

type SheetProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
};

function exitDurationMs(): number {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : SHEET_TRANSITION_MS;
}

function useSheetPresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) {
      let secondFrame = 0;
      const firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(firstFrame);
        cancelAnimationFrame(secondFrame);
      };
    }
    if (!mounted) return;
    const timer = setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitDurationMs());
    return () => clearTimeout(timer);
  }, [open, mounted]);

  return { mounted, raised: open && entered };
}

function useSwipeDown(panelRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  const startY = useRef<number | null>(null);
  const offset = useRef(0);
  const [dragging, setDragging] = useState(false);

  const moveTo = (pixels: number) => {
    offset.current = pixels;
    if (panelRef.current)
      panelRef.current.style.transform = pixels ? `translateY(${pixels}px)` : "";
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    startY.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (startY.current !== null) moveTo(Math.max(0, event.clientY - startY.current));
  };
  const onPointerEnd = () => {
    if (startY.current === null) return;
    const shouldClose = offset.current >= SHEET_SWIPE_CLOSE_PX;
    startY.current = null;
    moveTo(0);
    setDragging(false);
    if (shouldClose) onClose();
  };

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
  };
}

export function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isClient = useIsClient();
  const active = open && isClient;
  const { mounted, raised } = useSheetPresence(active);
  const swipe = useSwipeDown(panelRef, onClose);
  useLockBodyScroll(active);
  useFocusTrap({ active, containerRef: panelRef, onEscape: onClose });

  if (!mounted || !isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end justify-center" inert={!active}>
      <div
        aria-hidden="true"
        data-testid="sheet-dim"
        onClick={onClose}
        className={mergeClasses(
          "absolute inset-0 bg-j-midnight/45 transition-opacity",
          SHEET_TRANSITION_CLASSES,
          raised ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        data-state={raised ? "open" : "closed"}
        className={mergeClasses(
          "relative flex max-h-[92dvh] w-full max-w-lg translate-y-full flex-col gap-4 overflow-y-auto rounded-t-[20px] bg-j-cream px-[22px] pt-[22px] pb-[26px] shadow-[0_-8px_30px_rgba(13,11,26,0.25)] focus:outline-none data-[state=open]:translate-y-0",
          !swipe.dragging && ["transition-transform", SHEET_TRANSITION_CLASSES],
        )}
      >
        <div
          aria-hidden="true"
          data-testid="sheet-handle"
          {...swipe.handlers}
          className="-mx-[22px] -mt-[22px] hidden shrink-0 touch-none justify-center pt-[22px] pb-2 any-pointer-coarse:flex"
        >
          <div className="h-1 w-10 rounded bg-j-blush" />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
